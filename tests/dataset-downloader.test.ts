import {
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as tar from "tar-stream";
import { AihubDownloadClient } from "../src/adapters/aihub/download-client.js";
import { AihubMetadataClient } from "../src/adapters/aihub/metadata-client.js";
import type { AihubConfig } from "../src/config.js";
import { DatasetDownloader } from "../src/download/dataset-downloader.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) =>
      rm(path, { recursive: true, force: true }),
    ),
  );
});

describe("DatasetDownloader", () => {
  it("downloads a selected file through a temporary TAR and finalizes it", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "codex-aihub-download-test-"));
    temporaryDirectories.push(root);
    const destination = resolve(root, "ready");
    const archive = await tarBuffer("dataset/labels.zip", "abc");
    const config = fakeConfig();
    const metadataClient = new AihubMetadataClient({
      config: () => config,
      fetchImpl: vi.fn(async () => metadataResponse()) as unknown as typeof fetch,
    });
    const downloadFetch = vi.fn(async () =>
      new Response(archive, {
        status: 200,
        headers: {
          "Content-Type": "application/x-tar",
          "Content-Length": String(archive.byteLength),
        },
      }),
    );
    const downloadClient = new AihubDownloadClient({
      config: () => config,
      fetchImpl: downloadFetch as unknown as typeof fetch,
    });
    const downloader = new DatasetDownloader(metadataClient, downloadClient);

    const result = await downloader.downloadFiles({
      datasetId: 123,
      fileIds: [456],
      destination,
    });

    expect(result.destination).toBe(destination);
    expect(result.extractedFiles).toEqual(["dataset/labels.zip"]);
    expect(result.extractedFileCount).toBe(1);
    await expect(
      readFile(resolve(destination, "dataset", "labels.zip"), "utf8"),
    ).resolves.toBe("abc");
    const [url, init] = downloadFetch.mock.calls[0] as unknown as [
      URL,
      RequestInit,
    ];
    expect(url.searchParams.get("fileSn")).toBe("456");
    expect(new Headers(init.headers).get("apikey")).toBe("fake-key");
  });
});

function fakeConfig(): AihubConfig {
  return {
    apiKey: "fake-key",
    metadataBaseUrl: "https://metadata.example.test",
    downloadBaseUrl: "https://download.example.test",
    downloadVersion: "0.6",
    timeoutMs: 5_000,
    downloadTimeoutMs: 60_000,
  };
}

function metadataResponse(): Response {
  return new Response(
    JSON.stringify({
      result: "SUCCESS",
      data: {
        "주요 정보": {
          dataSetSn: { value: "123" },
          dataNm: { value: "합성 데이터" },
          url: { value: "https://aihub.or.kr/example/123" },
        },
        "파일 목록(API 다운로드)": {
          fileList: {
            value: [
              {
                fileSn: { value: 456 },
                fileSize: { value: 3 },
                fileStreCours: { value: "dataset/labels.zip" },
                streFileNm: { value: "labels.zip" },
              },
            ],
          },
        },
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

async function tarBuffer(name: string, body: string): Promise<ArrayBuffer> {
  const pack = tar.pack();
  pack.entry({ name }, body);
  pack.finalize();
  const chunks: Buffer[] = [];
  for await (const chunk of pack) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}
