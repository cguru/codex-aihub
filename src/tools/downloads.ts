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

export function registerDownloadTools(
  server: McpServer,
  downloader: DatasetDownloader,
): void {
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
        "Download explicitly selected, approved AI Hub dataset files into a new absolute destination directory. Call only after the user has explicitly requested a download and the exact file keys, sizes, and destination have been resolved. Never use it to download every file by default. It refuses existing destinations, checks disk space, extracts TAR paths safely, and merges numeric .part files.",
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
