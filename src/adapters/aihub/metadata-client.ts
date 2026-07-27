import { AihubError, redactSecret } from "../../errors.js";
import type { AihubConfig } from "../../config.js";
import {
  extractDetail,
  extractGuideCounts,
  extractList,
  extractTotalCount,
  requireEnvelope,
  throwIfFailed,
} from "./response.js";
import type {
  DatasetFilters,
  GuideDatasetsResult,
  GuideDocumentType,
  SearchDatasetsInput,
  SearchDatasetsResult,
} from "./types.js";
import { extractDatasetFileInventory } from "../../download/inventory.js";
import type { DatasetFileInventory } from "../../download/types.js";

const ENDPOINTS = {
  search: "/mcp/dataSetList.do",
  count: "/mcp/dataSetCnt.do",
  detail: "/mcp/dataSetDetail.do",
  guide: "/mcp/getDataSetsWithGuide.do",
} as const;

const AUDIT_TOOLS = {
  search: "searchDataSets",
  count: "countDataSets",
  detail: "getDataSet",
  guide: "getDataSetsWithGuide",
} as const;

type FetchImplementation = typeof globalThis.fetch;

export interface MetadataClientOptions {
  config: () => AihubConfig;
  fetchImpl?: FetchImplementation;
}

export class AihubMetadataClient {
  private readonly configProvider: () => AihubConfig;
  private readonly fetchImpl: FetchImplementation;

  constructor(options: MetadataClientOptions) {
    this.configProvider = options.config;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  async searchDatasets(input: SearchDatasetsInput): Promise<SearchDatasetsResult> {
    const limit = clamp(input.limit ?? 50, 1, 200);
    const offset = Math.max(0, input.offset ?? 0);
    const envelope = await this.request(
      ENDPOINTS.search,
      searchParams(input, { limit, offset }),
      AUDIT_TOOLS.search,
    );
    const items = extractList(envelope, ENDPOINTS.search);
    const totalCount = extractTotalCount(envelope, ENDPOINTS.search, items.length);
    return { totalCount, items, limit, offset };
  }

  async countDatasets(filters: DatasetFilters): Promise<number> {
    const envelope = await this.request(
      ENDPOINTS.count,
      searchParams(filters),
      AUDIT_TOOLS.count,
    );
    return extractTotalCount(envelope, ENDPOINTS.count);
  }

  async getDataset(id: number): Promise<Record<string, unknown> | null> {
    const envelope = await this.request(
      ENDPOINTS.detail,
      new URLSearchParams({ dataSetSn: String(id) }),
      AUDIT_TOOLS.detail,
    );
    return extractDetail(envelope, ENDPOINTS.detail);
  }

  async getDatasetFileInventory(
    id: number,
  ): Promise<DatasetFileInventory | null> {
    const dataset = await this.getDataset(id);
    return dataset === null
      ? null
      : extractDatasetFileInventory(id, dataset);
  }

  async getDatasetsWithGuide(
    docType: GuideDocumentType,
    requestedLimit = 50,
  ): Promise<GuideDatasetsResult> {
    const limit = clamp(requestedLimit, 1, 200);
    const envelope = await this.request(
      ENDPOINTS.guide,
      new URLSearchParams({
        srchGuideFileSe: guideCode(docType),
        firstIndex: "0",
        recordCountPerPage: String(limit),
      }),
      AUDIT_TOOLS.guide,
    );

    return {
      counts: extractGuideCounts(envelope, ENDPOINTS.guide),
      datasets: extractList(envelope, ENDPOINTS.guide),
      limit,
    };
  }

  private async request(
    endpoint: string,
    params: URLSearchParams,
    auditTool: string,
  ): Promise<Record<string, unknown>> {
    const config = this.configProvider();
    const url = new URL(endpoint, `${config.metadataBaseUrl}/`);
    url.search = params.toString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-API-KEY": config.apiKey,
          "X-MCP-Client": "codex-aihub",
          "X-MCP-Tool": auditTool,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const authFailure = response.status === 401 || response.status === 403;
        throw new AihubError(
          authFailure ? "AIHUB_AUTH_FAILED" : "AIHUB_HTTP_ERROR",
          authFailure
            ? "AI Hub 인증에 실패했습니다. API 키와 데이터 이용 권한을 확인하세요."
            : `AI Hub가 HTTP ${response.status}로 응답했습니다.`,
          {
            status: response.status,
            endpoint,
            retryable: response.status >= 500 || response.status === 429,
          },
        );
      }

      let value: unknown;
      try {
        value = await response.json();
      } catch (cause) {
        throw new AihubError(
          "AIHUB_API_CHANGED",
          "AI Hub API 응답이 JSON 형식이 아닙니다. 엔드포인트가 변경되었을 수 있습니다.",
          { endpoint, cause },
        );
      }

      const envelope = requireEnvelope(value, endpoint);
      throwIfFailed(envelope, endpoint, config.apiKey);
      return envelope;
    } catch (error) {
      if (error instanceof AihubError) {
        throw error;
      }
      if (controller.signal.aborted) {
        throw new AihubError(
          "AIHUB_TIMEOUT",
          "AI Hub 요청 시간이 초과되었습니다. 잠시 후 다시 시도하세요.",
          { endpoint, retryable: true, cause: error },
        );
      }
      const message =
        error instanceof Error
          ? redactSecret(error.message, config.apiKey)
          : "unknown network error";
      throw new AihubError(
        "AIHUB_NETWORK_ERROR",
        `AI Hub에 연결하지 못했습니다: ${message}`,
        { endpoint, retryable: true, cause: error },
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

function searchParams(
  filters: DatasetFilters,
  paging?: { limit: number; offset: number },
): URLSearchParams {
  const params = new URLSearchParams();
  add(params, "searchKeyword", filters.keyword);
  add(params, "srchDataRealmCode", filters.realmCode);

  const classDetailCode = clean(filters.classDetailCode);
  const classCode =
    clean(filters.classCode) ??
    (classDetailCode ? parentClassCode(classDetailCode) : undefined);
  add(params, "srchdataClCode", classCode);
  add(params, "srchDataClDetailCode", classDetailCode);
  add(params, "srchOneDataTy", filters.dataType);
  add(params, "srchOneDataCnstcYear", filters.constructionYear);
  add(params, "srchDetailCnd", filters.detailCondition);

  if (paging) {
    params.set("firstIndex", String(paging.offset));
    params.set("recordCountPerPage", String(paging.limit));
  }
  return params;
}

function add(params: URLSearchParams, name: string, value: string | undefined): void {
  const normalized = clean(value);
  if (normalized !== undefined) {
    params.set(name, normalized);
  }
}

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function parentClassCode(detailCode: string): string {
  return detailCode === "DATACLDETAIL001" ? "DATACL001" : "DATACL002";
}

function guideCode(docType: GuideDocumentType): string {
  if (docType === "manual") {
    return "FILESE001";
  }
  if (docType === "guide") {
    return "FILESE002";
  }
  return "ANY";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
