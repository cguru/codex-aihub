import { describe, expect, it, vi } from "vitest";
import { AihubDownloadClient } from "../src/adapters/aihub/download-client.js";
import type { AihubConfig } from "../src/config.js";
import { AihubError } from "../src/errors.js";

const config: AihubConfig = {
  apiKey: "secret-fake-key",
  metadataBaseUrl: "https://metadata.example.test",
  downloadBaseUrl: "https://download.example.test",
  downloadVersion: "0.6",
  timeoutMs: 5_000,
  downloadTimeoutMs: 60_000,
};

describe("AihubDownloadClient", () => {
  it("uses the official header and keeps the API key out of the URL", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "application/x-tar" },
      }),
    );
    const client = createClient(fetchMock);

    const response = await client.openDatasetFiles(71362, [11, 22]);
    await response.arrayBuffer();

    const [requestUrl, init] = fetchMock.mock.calls[0] as unknown as [
      URL,
      RequestInit,
    ];
    expect(requestUrl.pathname).toBe("/down/0.6/71362.do");
    expect(requestUrl.searchParams.get("fileSn")).toBe("11,22");
    expect(requestUrl.toString()).not.toContain("secret-fake-key");
    expect(new Headers(init.headers).get("apikey")).toBe("secret-fake-key");
  });

  it("translates an authorization response into a safe approval message", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("secret-fake-key 데이터 승인 필요", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      }),
    );
    const client = createClient(fetchMock);

    const error = await client.openDatasetFiles(71362, [11]).catch((caught) => caught);

    expect(error).toBeInstanceOf(AihubError);
    expect((error as AihubError).code).toBe("AIHUB_DOWNLOAD_NOT_APPROVED");
    expect((error as Error).message).toContain(
      "승인받지 않은 데이터는 다운로드할 수 없습니다.",
    );
    expect((error as Error).message).toContain("데이터 사용 신청");
    expect((error as Error).message).not.toContain("secret-fake-key");
  });

  it("rejects a successful text response instead of treating it as an archive", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("unexpected text", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    );
    const client = createClient(fetchMock);

    const error = await client.openDatasetFiles(71362, [11]).catch((caught) => caught);

    expect(error).toBeInstanceOf(AihubError);
    expect((error as AihubError).code).toBe("AIHUB_DOWNLOAD_FAILED");
  });
});

function createClient(fetchMock: ReturnType<typeof vi.fn>): AihubDownloadClient {
  return new AihubDownloadClient({
    config: () => config,
    fetchImpl: fetchMock as unknown as typeof fetch,
  });
}
