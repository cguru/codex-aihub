import { createWriteStream } from "node:fs";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { afterEach, describe, expect, it } from "vitest";
import * as tar from "tar-stream";
import {
  extractTarSafely,
  mergeMultipartFiles,
} from "../src/download/archive.js";
import { AihubError } from "../src/errors.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  );
});

describe("safe TAR handling", () => {
  it("extracts regular files and merges numeric parts in numeric order", async () => {
    const root = await temporaryRoot();
    const archive = resolve(root, "input.tar");
    await createTar(archive, [
      { name: "dataset/labels.zip.part10", body: "C" },
      { name: "dataset/labels.zip.part8", body: "A" },
      { name: "dataset/labels.zip.part9", body: "B" },
    ]);
    const output = resolve(root, "output");

    await extractTarSafely(archive, output, 1024);
    await mergeMultipartFiles(output);

    await expect(
      readFile(resolve(output, "dataset", "labels.zip"), "utf8"),
    ).resolves.toBe("ABC");
  });

  it("blocks path traversal entries", async () => {
    const root = await temporaryRoot();
    const archive = resolve(root, "unsafe.tar");
    await createTar(archive, [{ name: "../outside.txt", body: "blocked" }]);

    const error = await extractTarSafely(
      archive,
      resolve(root, "output"),
      1024,
    ).catch((caught) => caught);

    expect(error).toBeInstanceOf(AihubError);
    expect((error as AihubError).code).toBe("AIHUB_ARCHIVE_UNSAFE");
  });

  it("blocks links in downloaded archives", async () => {
    const root = await temporaryRoot();
    const archive = resolve(root, "link.tar");
    const pack = tar.pack();
    pack.entry({ name: "link", type: "symlink", linkname: "target" });
    pack.finalize();
    await pipeline(pack, createWriteStream(archive));

    const error = await extractTarSafely(
      archive,
      resolve(root, "output"),
      1024,
    ).catch((caught) => caught);

    expect(error).toBeInstanceOf(AihubError);
    expect((error as AihubError).code).toBe("AIHUB_ARCHIVE_UNSAFE");
  });
});

async function temporaryRoot(): Promise<string> {
  const path = await mkdtemp(resolve(tmpdir(), "codex-aihub-test-"));
  temporaryDirectories.push(path);
  return path;
}

async function createTar(
  path: string,
  entries: Array<{ name: string; body: string }>,
): Promise<void> {
  await mkdir(resolve(path, ".."), { recursive: true });
  const pack = tar.pack();
  for (const entry of entries) {
    pack.entry({ name: entry.name }, entry.body);
  }
  pack.finalize();
  await pipeline(pack, createWriteStream(path));
}
