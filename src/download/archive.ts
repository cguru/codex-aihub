import { createReadStream, createWriteStream } from "node:fs";
import {
  access,
  mkdir,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import { once } from "node:events";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import * as tar from "tar-stream";
import { AihubError } from "../errors.js";

export async function extractTarSafely(
  archivePath: string,
  destination: string,
  maxExtractedBytes: number,
): Promise<void> {
  await mkdir(destination, { recursive: false });
  const extractor = tar.extract();
  let extractedBytes = 0;
  let entryError: unknown;

  extractor.on("entry", (header, stream, next) => {
    void handleEntry().then(next, (error: unknown) => {
      entryError = error;
      stream.destroy();
      extractor.destroy(error instanceof Error ? error : new Error("extract failed"));
    });

    async function handleEntry(): Promise<void> {
      const target = safeTarget(destination, header.name);
      const type = header.type ?? "file";

      if (type === "directory") {
        await mkdir(target.absolute, { recursive: true });
        stream.resume();
        await once(stream, "end");
        return;
      }

      if (type !== "file") {
        throw new AihubError(
          "AIHUB_ARCHIVE_UNSAFE",
          `다운로드 TAR에 허용되지 않은 항목 유형(${type})이 있습니다.`,
        );
      }

      const size = Number(header.size ?? 0);
      if (!Number.isSafeInteger(size) || size < 0) {
        throw new AihubError(
          "AIHUB_ARCHIVE_INVALID",
          "다운로드 TAR의 파일 크기 정보가 올바르지 않습니다.",
        );
      }
      extractedBytes += size;
      if (extractedBytes > maxExtractedBytes) {
        throw new AihubError(
          "AIHUB_ARCHIVE_INVALID",
          "다운로드 TAR의 실제 파일 크기가 선택한 파일의 예상 크기를 초과했습니다.",
        );
      }

      await mkdir(dirname(target.absolute), { recursive: true });
      await pipeline(
        stream,
        createWriteStream(target.absolute, { flags: "wx" }),
      );
    }
  });

  try {
    await pipeline(createReadStream(archivePath), extractor);
  } catch (error) {
    if (entryError instanceof AihubError) {
      throw entryError;
    }
    if (error instanceof AihubError) {
      throw error;
    }
    throw new AihubError(
      "AIHUB_ARCHIVE_INVALID",
      "AI Hub 다운로드 TAR를 안전하게 해제하지 못했습니다.",
      { cause: error },
    );
  }
}

export async function mergeMultipartFiles(root: string): Promise<void> {
  const files = await listFiles(root);
  const groups = new Map<string, Array<{ index: number; path: string }>>();

  for (const path of files) {
    const match = path.match(/^(.*)\.part(\d+)$/i);
    if (!match?.[1] || !match[2]) {
      continue;
    }
    const group = groups.get(match[1]) ?? [];
    group.push({ index: Number(match[2]), path });
    groups.set(match[1], group);
  }

  for (const [target, parts] of groups) {
    parts.sort((left, right) => left.index - right.index);
    ensureContiguous(parts);
    if (await pathExists(target)) {
      throw new AihubError(
        "AIHUB_ARCHIVE_UNSAFE",
        "분할 파일을 병합할 대상이 이미 TAR 안에 존재합니다.",
      );
    }

    const temporary = `${target}.merge-partial`;
    const output = createWriteStream(temporary, { flags: "wx" });
    try {
      for (const part of parts) {
        for await (const chunk of createReadStream(part.path)) {
          if (!output.write(chunk)) {
            await once(output, "drain");
          }
        }
      }
      output.end();
      await once(output, "finish");
      await rename(temporary, target);
      await Promise.all(parts.map((part) => rm(part.path)));
    } catch (error) {
      output.destroy();
      await rm(temporary, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}

export async function listRelativeFiles(root: string): Promise<string[]> {
  const files = await listFiles(root);
  return files
    .map((path) => relative(root, path).replaceAll("\\", "/"))
    .sort((left, right) => left.localeCompare(right, "ko"));
}

function safeTarget(
  root: string,
  archiveName: string,
): { absolute: string; relative: string } {
  const normalized = archiveName.replaceAll("\\", "/");
  if (
    normalized.includes("\0") ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized)
  ) {
    throw unsafePath();
  }

  const segments = normalized.split("/").filter((segment) => segment !== "");
  if (
    segments.length === 0 ||
    segments.some((segment) => segment === "." || segment === "..")
  ) {
    throw unsafePath();
  }

  const absolute = resolve(root, ...segments);
  const relativePath = relative(root, absolute);
  if (
    relativePath === "" ||
    relativePath.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
    relativePath === ".." ||
    isAbsolute(relativePath)
  ) {
    throw unsafePath();
  }

  return { absolute, relative: relativePath.replaceAll("\\", "/") };
}

function unsafePath(): AihubError {
  return new AihubError(
    "AIHUB_ARCHIVE_UNSAFE",
    "다운로드 TAR에서 저장 경로를 벗어나는 항목을 차단했습니다.",
  );
}

async function listFiles(root: string): Promise<string[]> {
  const output: string[] = [];
  const entries = await readdir(root, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      throw new AihubError(
        "AIHUB_ARCHIVE_UNSAFE",
        "다운로드 결과에서 심볼릭 링크를 차단했습니다.",
      );
    }
    if (entry.isFile()) {
      output.push(resolve(entry.parentPath, entry.name));
    }
  }
  return output;
}

function ensureContiguous(parts: Array<{ index: number }>): void {
  if (parts.length === 0) {
    return;
  }
  for (let index = 1; index < parts.length; index += 1) {
    if (parts[index]!.index !== parts[index - 1]!.index + 1) {
      throw new AihubError(
        "AIHUB_ARCHIVE_INVALID",
        "AI Hub 분할 파일의 일부가 누락되어 병합할 수 없습니다.",
      );
    }
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
