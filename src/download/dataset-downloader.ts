import { createWriteStream } from "node:fs";
import {
  access,
  mkdir,
  mkdtemp,
  rename,
  rm,
  statfs,
} from "node:fs/promises";
import { basename, dirname, isAbsolute, parse, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { AihubMetadataClient } from "../adapters/aihub/metadata-client.js";
import type { AihubDownloadClient } from "../adapters/aihub/download-client.js";
import { AihubError } from "../errors.js";
import {
  extractTarSafely,
  listRelativeFiles,
  mergeMultipartFiles,
} from "./archive.js";
import type {
  CheckDownloadCapacityInput,
  DatasetDownloadAccessResult,
  DatasetFile,
  DatasetFileInventory,
  DatasetFilePage,
  DownloadCapacityResult,
  DownloadDatasetFilesInput,
  DownloadDatasetFilesResult,
} from "./types.js";

const MIN_DISK_MARGIN = 64 * 1024 * 1024;
const MAX_RETURNED_PATHS = 200;

export interface DiskSpaceSnapshot {
  filesystemPath: string;
  availableBytes: number;
}

type DiskSpaceInspector = (destination: string) => Promise<DiskSpaceSnapshot>;

export class DatasetDownloader {
  constructor(
    private readonly metadataClient: AihubMetadataClient,
    private readonly downloadClient: AihubDownloadClient,
    private readonly diskSpaceInspector: DiskSpaceInspector =
      inspectAvailableDiskSpace,
  ) {}

  async listFiles(
    datasetId: number,
    options: {
      query?: string | undefined;
      sort: "original" | "size_asc" | "size_desc";
      limit: number;
      offset: number;
    },
  ): Promise<DatasetFilePage> {
    const inventory = await this.requireInventory(datasetId);
    const query = options.query?.trim().toLocaleLowerCase("ko");
    let files = query
      ? inventory.files.filter((file) =>
          `${file.name}\n${file.path}`.toLocaleLowerCase("ko").includes(query),
        )
      : [...inventory.files];

    if (options.sort === "size_asc") {
      files.sort((left, right) => left.sizeBytes - right.sizeBytes);
    } else if (options.sort === "size_desc") {
      files.sort((left, right) => right.sizeBytes - left.sizeBytes);
    }

    const totalCount = files.length;
    const totalSizeBytes = sumSizes(files);
    return {
      ...inventory,
      files: files.slice(options.offset, options.offset + options.limit),
      totalCount,
      totalSizeBytes,
      limit: options.limit,
      offset: options.offset,
    };
  }

  async checkCapacity(
    input: CheckDownloadCapacityInput,
  ): Promise<DownloadCapacityResult> {
    const inventory = await this.requireInventory(input.datasetId);
    const files =
      input.fileIds === undefined
        ? inventory.files
        : selectFiles(inventory, input.fileIds);
    const destination = validateDestination(input.destination);
    const [disk, destinationExists] = await Promise.all([
      this.diskSpaceInspector(destination),
      pathExists(destination),
    ]);
    const downloadBytes = sumSizes(files);
    const minimumFreeBytes = minimumRequiredBytes(downloadBytes);
    const recommendedFreeBytes = recommendedRequiredBytes(downloadBytes);
    const minimumShortfallBytes = Math.max(
      0,
      minimumFreeBytes - disk.availableBytes,
    );
    const recommendedShortfallBytes = Math.max(
      0,
      recommendedFreeBytes - disk.availableBytes,
    );

    return {
      datasetId: inventory.datasetId,
      datasetName: inventory.datasetName,
      datasetUrl: inventory.datasetUrl,
      scope: input.fileIds === undefined ? "all" : "selected",
      fileCount: files.length,
      totalFileCount: inventory.files.length,
      downloadBytes,
      minimumFreeBytes,
      recommendedFreeBytes,
      availableBytes: disk.availableBytes,
      minimumShortfallBytes,
      recommendedShortfallBytes,
      minimumFits: minimumShortfallBytes === 0,
      recommendedFits: recommendedShortfallBytes === 0,
      destination,
      destinationExists,
      filesystemPath: disk.filesystemPath,
    };
  }

  async checkAccess(datasetId: number): Promise<DatasetDownloadAccessResult> {
    const inventory = await this.requireInventory(datasetId);
    const probeFile = [...inventory.files].sort(
      (left, right) => left.sizeBytes - right.sizeBytes,
    )[0];
    if (!probeFile) {
      throw new AihubError(
        "AIHUB_FILE_NOT_FOUND",
        `AI Hub 데이터셋 ${datasetId}에 다운로드 가능 여부를 확인할 정식 API 파일이 없습니다.`,
      );
    }

    const response = await this.downloadClient.openDatasetFiles(datasetId, [
      probeFile.fileId,
    ]);
    await response.body?.cancel("AI Hub download access check completed");

    return {
      datasetId: inventory.datasetId,
      datasetName: inventory.datasetName,
      datasetUrl: inventory.datasetUrl,
      approved: true,
      probeFile,
    };
  }

  async downloadFiles(
    input: DownloadDatasetFilesInput,
  ): Promise<DownloadDatasetFilesResult> {
    const inventory = await this.requireInventory(input.datasetId);
    const selectedFiles = selectFiles(inventory, input.fileIds);
    const expectedBytes = sumSizes(selectedFiles);
    const destination = validateDestination(input.destination);
    await ensureMissing(destination);

    const parent = dirname(destination);
    await mkdir(parent, { recursive: true });
    await ensureDiskSpace(parent, expectedBytes);

    const temporaryRoot = await mkdtemp(
      resolve(parent, `.${basename(destination)}.aihub-`),
    );
    const archivePath = resolve(temporaryRoot, "download.tar.part");
    const extractedPath = resolve(temporaryRoot, "extracted");
    const maxTransferBytes =
      expectedBytes + Math.max(MIN_DISK_MARGIN, Math.ceil(expectedBytes * 0.1));

    try {
      const response = await this.downloadClient.openDatasetFiles(
        input.datasetId,
        selectedFiles.map((file) => file.fileId),
      );
      const contentLength = readContentLength(response);
      if (contentLength !== null && contentLength > maxTransferBytes) {
        throw new AihubError(
          "AIHUB_DOWNLOAD_FAILED",
          "AI Hub 다운로드 응답 크기가 선택한 파일의 예상 크기를 초과했습니다.",
        );
      }

      const limiter = new ByteLimit(maxTransferBytes);
      await pipeline(
        Readable.fromWeb(
          response.body! as unknown as import("node:stream/web").ReadableStream<Uint8Array>,
        ),
        limiter,
        createWriteStream(archivePath, { flags: "wx" }),
      );

      await extractTarSafely(archivePath, extractedPath, maxTransferBytes);
      await mergeMultipartFiles(extractedPath);
      await rm(archivePath, { force: true });

      const allExtractedFiles = await listRelativeFiles(extractedPath);
      await ensureMissing(destination);
      await rename(extractedPath, destination);
      await rm(temporaryRoot, { recursive: true, force: true });

      return {
        datasetId: inventory.datasetId,
        datasetName: inventory.datasetName,
        datasetUrl: inventory.datasetUrl,
        destination,
        selectedFiles,
        expectedBytes,
        downloadedBytes: limiter.bytes,
        extractedFiles: allExtractedFiles.slice(0, MAX_RETURNED_PATHS),
        extractedFileCount: allExtractedFiles.length,
      };
    } catch (error) {
      await rm(temporaryRoot, { recursive: true, force: true }).catch(
        () => undefined,
      );
      throw error;
    }
  }

  private async requireInventory(
    datasetId: number,
  ): Promise<DatasetFileInventory> {
    const inventory =
      await this.metadataClient.getDatasetFileInventory(datasetId);
    if (inventory === null) {
      throw new AihubError(
        "AIHUB_DATASET_NOT_FOUND",
        `AI Hub 데이터셋 ${datasetId}을 찾지 못했습니다.`,
      );
    }
    return inventory;
  }
}

class ByteLimit extends Transform {
  bytes = 0;

  constructor(private readonly maximum: number) {
    super();
  }

  override _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null, data?: Buffer) => void,
  ): void {
    this.bytes += chunk.byteLength;
    if (this.bytes > this.maximum) {
      callback(
        new AihubError(
          "AIHUB_DOWNLOAD_FAILED",
          "AI Hub 다운로드 크기가 안전 제한을 초과했습니다.",
        ),
      );
      return;
    }
    callback(null, chunk);
  }
}

function selectFiles(
  inventory: DatasetFileInventory,
  fileIds: number[],
): DatasetFile[] {
  const uniqueIds = [...new Set(fileIds)];
  if (uniqueIds.length !== fileIds.length) {
    throw new AihubError(
      "AIHUB_FILE_NOT_FOUND",
      "중복된 AI Hub 파일 키가 포함되어 있습니다.",
    );
  }

  const byId = new Map(inventory.files.map((file) => [file.fileId, file]));
  const missing = uniqueIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new AihubError(
      "AIHUB_FILE_NOT_FOUND",
      `데이터셋 ${inventory.datasetId}에서 파일 키 ${missing.join(", ")}을 찾지 못했습니다.`,
    );
  }
  return uniqueIds.map((id) => byId.get(id)!);
}

function validateDestination(value: string): string {
  const normalized = value.trim();
  if (!normalized || !isAbsolute(normalized)) {
    throw new AihubError(
      "AIHUB_INVALID_DESTINATION",
      "다운로드 저장 경로는 새로 만들 절대 경로여야 합니다.",
    );
  }
  const resolved = resolve(normalized);
  if (resolved === parse(resolved).root) {
    throw new AihubError(
      "AIHUB_INVALID_DESTINATION",
      "드라이브 또는 파일시스템 루트에는 다운로드할 수 없습니다.",
    );
  }
  return resolved;
}

async function ensureMissing(path: string): Promise<void> {
  try {
    await access(path);
  } catch {
    return;
  }
  throw new AihubError(
    "AIHUB_DESTINATION_EXISTS",
    `다운로드 저장 경로가 이미 존재합니다. 다른 새 경로를 선택하세요: ${path}`,
  );
}

async function ensureDiskSpace(parent: string, expectedBytes: number): Promise<void> {
  let available: number;
  try {
    const stats = await statfs(parent);
    available = stats.bavail * stats.bsize;
  } catch {
    return;
  }

  const required = minimumRequiredBytes(expectedBytes);
  if (available < required) {
    throw new AihubError(
      "AIHUB_INSUFFICIENT_DISK",
      `다운로드와 안전한 압축 해제에 필요한 여유 공간이 부족합니다. 최소 ${required}바이트가 필요합니다.`,
    );
  }
}

export async function inspectAvailableDiskSpace(
  destination: string,
): Promise<DiskSpaceSnapshot> {
  let candidate = dirname(validateDestination(destination));

  while (true) {
    try {
      const stats = await statfs(candidate);
      const availableBytes = stats.bavail * stats.bsize;
      if (!Number.isSafeInteger(availableBytes) || availableBytes < 0) {
        throw new AihubError(
          "AIHUB_INVALID_DESTINATION",
          "대상 파일시스템의 여유 공간을 안전하게 계산할 수 없습니다.",
        );
      }
      return {
        filesystemPath: candidate,
        availableBytes,
      };
    } catch (error) {
      if (error instanceof AihubError) {
        throw error;
      }
      const parent = dirname(candidate);
      if (parent === candidate) {
        throw new AihubError(
          "AIHUB_INVALID_DESTINATION",
          `다운로드 대상 드라이브의 여유 공간을 확인할 수 없습니다: ${destination}`,
        );
      }
      candidate = parent;
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

export function minimumRequiredBytes(downloadBytes: number): number {
  return (
    downloadBytes * 2 +
    Math.max(MIN_DISK_MARGIN, Math.ceil(downloadBytes * 0.1))
  );
}

export function recommendedRequiredBytes(downloadBytes: number): number {
  return (
    downloadBytes * 3 +
    Math.max(MIN_DISK_MARGIN, Math.ceil(downloadBytes * 0.1))
  );
}

function readContentLength(response: Response): number | null {
  const value = response.headers.get("content-length");
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function sumSizes(files: DatasetFile[]): number {
  return files.reduce((sum, file) => sum + file.sizeBytes, 0);
}
