import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DatasetDownloader } from "../download/dataset-downloader.js";
import { publicError } from "../errors.js";

const datasetFile = z.object({
  fileId: z.number().int().positive(),
  name: z.string(),
  path: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});

const listAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const downloadAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

const accessCheckAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const capacityAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function registerDownloadTools(
  server: McpServer,
  downloader: DatasetDownloader,
): void {
  server.registerTool(
    "check_dataset_download_access",
    {
      title: "Check AI Hub dataset download access",
      description:
        "Check whether the current AIHUB_API_KEY can download the full API files for one AI Hub dataset. Call this first whenever the user asks to download a dataset or build something from downloaded data, unless the user explicitly asked for sample/lightweight sample data. The check opens the smallest API file response only long enough to verify authorization, cancels it immediately, and does not save dataset bytes.",
      inputSchema: {
        dataset_id: z
          .number()
          .int()
          .positive()
          .describe("AI Hub dataSetSn identifier parsed from the dataset URL."),
      },
      outputSchema: {
        datasetId: z.number().int().positive(),
        datasetName: z.string().nullable(),
        datasetUrl: z.string().url(),
        approved: z.literal(true),
        probeFile: datasetFile,
      },
      annotations: accessCheckAnnotations,
    },
    async ({ dataset_id: datasetId }) =>
      runTool(async () => {
        const result = await downloader.checkAccess(datasetId);
        return {
          data: result,
          message:
            "정식 API 데이터 다운로드 승인이 확인되었습니다. " +
            "승인 확인 과정에서는 파일을 저장하지 않았습니다.",
        };
      }),
  );

  server.registerTool(
    "check_download_capacity",
    {
      title: "Check AI Hub download capacity",
      description:
        "Compare the exact AI Hub API file inventory size with free space on the filesystem that will contain a prospective absolute destination. Omit file_ids to estimate the entire dataset without selecting it for download, or pass exact file IDs to check a selected subset. Returns the hard minimum used by the safe downloader and a larger recommendation for later ZIP extraction and work products. Call after full-data download approval is confirmed and again after exact files are selected. This tool writes nothing.",
      inputSchema: {
        dataset_id: z
          .number()
          .int()
          .positive()
          .describe("AI Hub dataSetSn identifier."),
        file_ids: z
          .array(z.number().int().positive())
          .min(1)
          .max(200)
          .optional()
          .describe(
            "Optional exact fileSn values. Omit only to estimate the full dataset; omission never authorizes a full download.",
          ),
        destination: z
          .string()
          .trim()
          .min(1)
          .max(2_048)
          .describe(
            "Prospective absolute destination directory whose containing filesystem should be checked. Nothing is created.",
          ),
      },
      outputSchema: {
        datasetId: z.number().int().positive(),
        datasetName: z.string().nullable(),
        datasetUrl: z.string().url(),
        scope: z.enum(["all", "selected"]),
        fileCount: z.number().int().nonnegative(),
        totalFileCount: z.number().int().nonnegative(),
        downloadBytes: z.number().int().nonnegative(),
        minimumFreeBytes: z.number().int().nonnegative(),
        recommendedFreeBytes: z.number().int().nonnegative(),
        availableBytes: z.number().int().nonnegative(),
        minimumShortfallBytes: z.number().int().nonnegative(),
        recommendedShortfallBytes: z.number().int().nonnegative(),
        minimumFits: z.boolean(),
        recommendedFits: z.boolean(),
        destination: z.string(),
        destinationExists: z.boolean(),
        filesystemPath: z.string(),
      },
      annotations: capacityAnnotations,
    },
    async ({ dataset_id: datasetId, file_ids: fileIds, destination }) =>
      runTool(async () => {
        const result = await downloader.checkCapacity({
          datasetId,
          fileIds,
          destination,
        });
        return {
          data: result,
          message: capacityMessage(result),
        };
      }),
  );

  server.registerTool(
    "list_dataset_files",
    {
      title: "List AI Hub dataset files",
      description:
        "List downloadable files for one AI Hub dataset, including exact byte sizes and file keys. Use this before downloading so the user can see and explicitly select files. A successful list does not prove that the user has download approval.",
      inputSchema: {
        dataset_id: z
          .number()
          .int()
          .positive()
          .describe("AI Hub dataSetSn identifier."),
        query: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .optional()
          .describe("Optional case-insensitive filename or path filter."),
        sort: z
          .enum(["original", "size_asc", "size_desc"])
          .default("size_asc")
          .describe("Result ordering. size_asc is safest for exploration."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .default(50)
          .describe("Maximum number of files to return."),
        offset: z
          .number()
          .int()
          .min(0)
          .default(0)
          .describe("Number of matching files to skip."),
      },
      outputSchema: {
        datasetId: z.number().int().positive(),
        datasetName: z.string().nullable(),
        datasetUrl: z.string().url(),
        files: z.array(datasetFile),
        totalCount: z.number().int().nonnegative(),
        totalSizeBytes: z.number().int().nonnegative(),
        limit: z.number().int().min(1).max(200),
        offset: z.number().int().nonnegative(),
      },
      annotations: listAnnotations,
    },
    async ({ dataset_id: datasetId, query, sort, limit, offset }) =>
      runTool(async () => {
        const result = await downloader.listFiles(datasetId, {
          query,
          sort,
          limit,
          offset,
        });
        return {
          data: result,
          message:
            `다운로드 파일 ${result.totalCount}개 중 ${result.files.length}개를 조회했습니다. ` +
            "목록 조회만으로 다운로드 승인이 확인되는 것은 아닙니다.",
        };
      }),
  );

  server.registerTool(
    "download_dataset_files",
    {
      title: "Download selected AI Hub dataset files",
      description:
        "Download explicitly selected, approved AI Hub dataset files into a new absolute destination directory. For ordinary full-data requests, call check_dataset_download_access first. Call this tool only after the user has explicitly requested a download and the exact file keys, sizes, and destination have been resolved. Never use it to download every file by default. It refuses existing destinations, checks disk space, extracts TAR paths safely, and merges numeric .part files.",
      inputSchema: {
        dataset_id: z
          .number()
          .int()
          .positive()
          .describe("AI Hub dataSetSn identifier."),
        file_ids: z
          .array(z.number().int().positive())
          .min(1)
          .max(100)
          .describe("Exact AI Hub fileSn values selected by the user."),
        destination: z
          .string()
          .trim()
          .min(1)
          .max(2_048)
          .describe(
            "New absolute destination directory. Existing paths are never overwritten.",
          ),
      },
      outputSchema: {
        datasetId: z.number().int().positive(),
        datasetName: z.string().nullable(),
        datasetUrl: z.string().url(),
        destination: z.string(),
        selectedFiles: z.array(datasetFile),
        expectedBytes: z.number().int().nonnegative(),
        downloadedBytes: z.number().int().nonnegative(),
        extractedFiles: z.array(z.string()),
        extractedFileCount: z.number().int().nonnegative(),
      },
      annotations: downloadAnnotations,
    },
    async ({
      dataset_id: datasetId,
      file_ids: fileIds,
      destination,
    }) =>
      runTool(async () => {
        const result = await downloader.downloadFiles({
          datasetId,
          fileIds,
          destination,
        });
        return {
          data: result,
          message:
            `${result.selectedFiles.length}개 파일을 ${result.destination}에 다운로드했습니다. ` +
            `완성된 파일은 ${result.extractedFileCount}개입니다.`,
        };
      }),
  );
}

function capacityMessage(result: {
  downloadBytes: number;
  minimumFreeBytes: number;
  recommendedFreeBytes: number;
  availableBytes: number;
  minimumShortfallBytes: number;
  minimumFits: boolean;
  recommendedFits: boolean;
  destinationExists: boolean;
}): string {
  const prefix =
    `예상 다운로드 ${formatBytes(result.downloadBytes)}, ` +
    `최소 여유 공간 ${formatBytes(result.minimumFreeBytes)}, ` +
    `권장 여유 공간 ${formatBytes(result.recommendedFreeBytes)}, ` +
    `현재 사용 가능 ${formatBytes(result.availableBytes)}입니다. `;
  const existing = result.destinationExists
    ? "지정한 목적 경로가 이미 있어 실제 다운로드에는 새 경로가 필요합니다. "
    : "";

  if (!result.minimumFits) {
    return (
      prefix +
      existing +
      `최소 공간이 ${formatBytes(result.minimumShortfallBytes)} 부족하므로 이 대상으로는 다운로드할 수 없습니다.`
    );
  }
  if (!result.recommendedFits) {
    return (
      prefix +
      existing +
      "안전 다운로드의 최소 조건은 충족하지만 ZIP 해제와 학습 산출물을 위한 권장 공간은 부족합니다."
    );
  }
  return prefix + existing + "다운로드와 후속 작업을 위한 권장 공간을 충족합니다.";
}

function formatBytes(bytes: number): string {
  if (bytes < 1_000_000_000) {
    return `${(bytes / 1_000_000).toFixed(2)} MB`;
  }
  if (bytes < 1_000_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  }
  return (
    `${(bytes / 1_000_000_000_000).toFixed(2)} TB` +
    ` (${(bytes / 1_099_511_627_776).toFixed(2)} TiB)`
  );
}

async function runTool<T extends object>(
  operation: () => Promise<{
    data: T;
    message: string;
  }>,
) {
  try {
    const result = await operation();
    return {
      structuredContent: result.data as Record<string, unknown>,
      content: [{ type: "text" as const, text: result.message }],
    };
  } catch (error) {
    const safe = publicError(error);
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `${safe.code}: ${safe.message}`,
        },
      ],
    };
  }
}
