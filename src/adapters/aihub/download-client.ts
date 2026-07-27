import { AihubError, redactSecret } from "../../errors.js";
import type { AihubConfig } from "../../config.js";

type FetchImplementation = typeof globalThis.fetch;

const ERROR_BODY_LIMIT = 8 * 1024;

export interface AihubDownloadClientOptions {
  config: () => AihubConfig;
  fetchImpl?: FetchImplementation;
}

export class AihubDownloadClient {
  private readonly configProvider: () => AihubConfig;
  private readonly fetchImpl: FetchImplementation;

  constructor(options: AihubDownloadClientOptions) {
    this.configProvider = options.config;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  async openDatasetFiles(
    datasetId: number,
    fileIds: number[],
  ): Promise<Response> {
    const config = this.configProvider();
    const url = new URL(
      `/down/${config.downloadVersion}/${datasetId}.do`,
      `${config.downloadBaseUrl}/`,
    );
    url.searchParams.set("fileSn", formatFileIds(fileIds));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.downloadTimeoutMs);
    let responseHandedOff = false;

    try {
      const response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/x-tar, application/octet-stream",
          apikey: config.apiKey,
        },
        redirect: "follow",
        signal: controller.signal,
      });

      if (!response.ok) {
        const diagnostic = await readBoundedText(response);
        if (
          response.status === 401 ||
          response.status === 403 ||
          looksLikeApprovalFailure(diagnostic)
        ) {
          throw notApproved(datasetId, response.status);
        }
        throw new AihubError(
          "AIHUB_DOWNLOAD_FAILED",
          `AI Hub 다운로드 서버가 HTTP ${response.status}로 응답했습니다.`,
          {
            status: response.status,
            endpoint: url.pathname,
            retryable: response.status >= 500 || response.status === 429,
          },
        );
      }

      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (
        contentType.includes("text/") ||
        contentType.includes("json") ||
        contentType.includes("html")
      ) {
        const diagnostic = await readBoundedText(response);
        if (looksLikeApprovalFailure(diagnostic)) {
          throw notApproved(datasetId, response.status);
        }
        throw new AihubError(
          "AIHUB_DOWNLOAD_FAILED",
          "AI Hub 다운로드 서버가 데이터 파일 대신 오류 응답을 반환했습니다.",
          { status: response.status, endpoint: url.pathname },
        );
      }

      if (response.body === null) {
        throw new AihubError(
          "AIHUB_DOWNLOAD_FAILED",
          "AI Hub 다운로드 응답에 파일 본문이 없습니다.",
          { status: response.status, endpoint: url.pathname },
        );
      }

      const wrapped = wrapTimedResponse(response, controller, timer);
      responseHandedOff = true;
      return wrapped;
    } catch (error) {
      if (error instanceof AihubError) {
        throw error;
      }
      if (controller.signal.aborted) {
        throw new AihubError(
          "AIHUB_TIMEOUT",
          "AI Hub 파일 다운로드 시간이 초과되었습니다.",
          { endpoint: url.pathname, retryable: true, cause: error },
        );
      }
      const message =
        error instanceof Error
          ? redactSecret(error.message, config.apiKey)
          : "unknown network error";
      throw new AihubError(
        "AIHUB_NETWORK_ERROR",
        `AI Hub 다운로드 서버에 연결하지 못했습니다: ${message}`,
        { endpoint: url.pathname, retryable: true, cause: error },
      );
    } finally {
      if (!responseHandedOff) {
        clearTimeout(timer);
      }
    }
  }
}

function formatFileIds(fileIds: number[]): string {
  return fileIds.length === 1 ? String(fileIds[0]) : `{${fileIds.join(",")}}`;
}

async function readBoundedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let length = 0;
  while (length < ERROR_BODY_LIMIT) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const remaining = ERROR_BODY_LIMIT - length;
    const chunk = value.subarray(0, remaining);
    chunks.push(chunk);
    length += chunk.byteLength;
    if (value.byteLength > remaining) {
      break;
    }
  }
  await reader.cancel().catch(() => undefined);
  return new TextDecoder().decode(concat(chunks, length));
}

function concat(chunks: Uint8Array[], length: number): Uint8Array {
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function wrapTimedResponse(
  response: Response,
  abortController: AbortController,
  timer: ReturnType<typeof setTimeout>,
): Response {
  const reader = response.body!.getReader();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const result = await reader.read();
        if (result.done) {
          clearTimeout(timer);
          controller.close();
          return;
        }
        controller.enqueue(result.value);
      } catch (error) {
        clearTimeout(timer);
        controller.error(
          abortController.signal.aborted
            ? new AihubError(
                "AIHUB_TIMEOUT",
                "AI Hub 파일 다운로드 시간이 초과되었습니다.",
                { retryable: true, cause: error },
              )
            : new AihubError(
                "AIHUB_NETWORK_ERROR",
                "AI Hub 파일을 받는 중 네트워크 연결이 끊어졌습니다.",
                { retryable: true, cause: error },
              ),
        );
      }
    },
    async cancel(reason) {
      clearTimeout(timer);
      abortController.abort();
      await reader.cancel(reason).catch(() => undefined);
    },
  });
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

function looksLikeApprovalFailure(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("승인") ||
    normalized.includes("권한") ||
    normalized.includes("신청") ||
    normalized.includes("not approved") ||
    normalized.includes("permission")
  );
}

function notApproved(datasetId: number, status: number): AihubError {
  const url =
    "https://aihub.or.kr/aihubdata/data/view.do?currMenu=115&topMenu=100" +
    `&aihubDataSe=data&dataSetSn=${datasetId}`;
  return new AihubError(
    "AIHUB_DOWNLOAD_NOT_APPROVED",
    "승인받지 않은 데이터는 다운로드할 수 없습니다. " +
      `AI Hub에서 데이터 사용 신청과 승인을 완료한 뒤 다시 요청해 주세요: ${url}`,
    { status, endpoint: `/down/{version}/${datasetId}.do` },
  );
}
