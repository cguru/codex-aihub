import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AihubMetadataClient } from "../adapters/aihub/metadata-client.js";
import type {
  DatasetFilters,
  SearchDatasetsInput,
} from "../adapters/aihub/types.js";
import { publicError } from "../errors.js";

const optionalCode = z.string().trim().min(1).max(64).optional();
const filtersShape = {
  keyword: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .describe("Dataset name, introduction, or keyword text.")
    .optional(),
  realm_code: optionalCode.describe(
    "AI Hub realm code, such as REALM002 for Korean or REALM006 for healthcare.",
  ),
  class_code: optionalCode.describe(
    "Parent classification code, normally inferred from class_detail_code.",
  ),
  class_detail_code: optionalCode.describe(
    "Detailed classification code: DATACLDETAIL001, DATACLDETAIL002, or DATACLDETAIL003.",
  ),
  data_type: optionalCode.describe(
    "Data type code: DATA001 image, DATA002 video, DATA003 text, DATA004 audio, DATA005 3D, DATA006 sensor.",
  ),
  construction_year: z
    .string()
    .regex(/^\d{4}$/)
    .describe("Four-digit construction year.")
    .optional(),
  detail_condition: optionalCode.describe(
    "DETAILCND003 for sample data or DETAILCND004 for safe-zone data.",
  ),
};

const datasetRecord = z.record(z.string(), z.unknown());

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export function registerDatasetTools(
  server: McpServer,
  client: AihubMetadataClient,
): void {
  server.registerTool(
    "search_datasets",
    {
      title: "Search AI Hub datasets",
      description:
        "Search AI Hub dataset metadata with optional keyword, realm, classification, data type, year, and sample/safe-zone filters. Returns the total match count and one page of results. Include each returned dataset URL when presenting results.",
      inputSchema: {
        ...filtersShape,
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .default(50)
          .describe("Maximum number of rows to return."),
        offset: z
          .number()
          .int()
          .min(0)
          .default(0)
          .describe("Number of matching rows to skip."),
      },
      outputSchema: {
        totalCount: z.number().int().nonnegative(),
        items: z.array(datasetRecord),
        limit: z.number().int().min(1).max(200),
        offset: z.number().int().nonnegative(),
      },
      annotations: readOnlyAnnotations,
    },
    async (input) =>
      runTool(
        async () => {
          const request: SearchDatasetsInput = {
            ...toFilters(input),
            limit: input.limit,
            offset: input.offset,
          };
          const result = await client.searchDatasets(request);
          return {
            data: {
              totalCount: result.totalCount,
              items: result.items,
              limit: result.limit,
              offset: result.offset,
            },
            message: `전체 ${result.totalCount}건 중 ${result.items.length}건을 조회했습니다.`,
          };
        },
      ),
  );

  server.registerTool(
    "count_datasets",
    {
      title: "Count AI Hub datasets",
      description:
        "Count every AI Hub dataset matching the supplied filters without fetching result rows. Prefer this tool when the user only asks how many datasets match.",
      inputSchema: filtersShape,
      outputSchema: {
        count: z.number().int().nonnegative(),
      },
      annotations: readOnlyAnnotations,
    },
    async (input) =>
      runTool(async () => {
        const count = await client.countDatasets(toFilters(input));
        return {
          data: { count },
          message: `조건에 맞는 데이터셋은 ${count}건입니다.`,
        };
      }),
  );

  server.registerTool(
    "get_dataset",
    {
      title: "Get AI Hub dataset details",
      description:
        "Get the complete metadata for one AI Hub dataset by dataSetSn. Returns null if the dataset is not found. Preserve the returned AI Hub URL when presenting or summarizing the dataset.",
      inputSchema: {
        id: z
          .number()
          .int()
          .positive()
          .describe("AI Hub dataSetSn identifier."),
      },
      outputSchema: {
        dataset: datasetRecord.nullable(),
      },
      annotations: readOnlyAnnotations,
    },
    async ({ id }) =>
      runTool(async () => {
        const dataset = await client.getDataset(id);
        return {
          data: { dataset },
          message:
            dataset === null
              ? "해당 데이터셋을 찾지 못했습니다."
              : "데이터셋 상세 정보를 조회했습니다.",
        };
      }),
  );

  server.registerTool(
    "get_datasets_with_guide",
    {
      title: "Find AI Hub datasets with guides",
      description:
        "List AI Hub datasets whose data manual or construction/use guide is available as readable Markdown. Returns manual and guide counts plus a bounded dataset list.",
      inputSchema: {
        document_type: z
          .enum(["manual", "guide", "any"])
          .default("any")
          .describe(
            "manual for data manuals, guide for construction/use guides, or any for either.",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .default(50)
          .describe("Maximum number of dataset rows to return."),
      },
      outputSchema: {
        counts: z.object({
          manual: z.number().int().nonnegative().nullable(),
          guide: z.number().int().nonnegative().nullable(),
        }),
        datasets: z.array(datasetRecord),
        limit: z.number().int().min(1).max(200),
      },
      annotations: readOnlyAnnotations,
    },
    async ({ document_type: documentType, limit }) =>
      runTool(async () => {
        const result = await client.getDatasetsWithGuide(documentType, limit);
        return {
          data: {
            counts: result.counts,
            datasets: result.datasets,
            limit: result.limit,
          },
          message: `설명서 또는 가이드가 있는 데이터셋 ${result.datasets.length}건을 조회했습니다.`,
        };
      }),
  );
}

async function runTool(
  operation: () => Promise<{
    data: Record<string, unknown>;
    message: string;
  }>,
) {
  try {
    const result = await operation();
    return {
      structuredContent: result.data,
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

function toFilters(input: {
  keyword?: string | undefined;
  realm_code?: string | undefined;
  class_code?: string | undefined;
  class_detail_code?: string | undefined;
  data_type?: string | undefined;
  construction_year?: string | undefined;
  detail_condition?: string | undefined;
}): DatasetFilters {
  const filters: DatasetFilters = {};
  assign(filters, "keyword", input.keyword);
  assign(filters, "realmCode", input.realm_code);
  assign(filters, "classCode", input.class_code);
  assign(filters, "classDetailCode", input.class_detail_code);
  assign(filters, "dataType", input.data_type);
  assign(filters, "constructionYear", input.construction_year);
  assign(filters, "detailCondition", input.detail_condition);
  return filters;
}

function assign<K extends keyof DatasetFilters>(
  target: DatasetFilters,
  key: K,
  value: DatasetFilters[K] | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}
