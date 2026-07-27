import { describe, expect, it, vi } from "vitest";
import { AihubMetadataClient } from "../src/adapters/aihub/metadata-client.js";
import type { AihubConfig } from "../src/config.js";
import { AihubError } from "../src/errors.js";

const fakeConfig: AihubConfig = {
  apiKey: "fake-test-key",
  metadataBaseUrl: "https://example.test",
  timeoutMs: 5_000,
};

describe("AihubMetadataClient", () => {
  it("maps search filters, attaches the key as a header, and unwraps dataset fields", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        result: "SUCCESS",
        totalCount: { "총 개수": 2 },
        data: {
          list: {
            value: [
              {
                dataSetSn: { value: "123", label: "식별자", description: "" },
                dataNm: { value: "합성 한국어 데이터", label: "이름", description: "" },
                url: {
                  value: "https://aihub.or.kr/example/123",
                  label: "URL",
                  description: "",
                },
                dataTys: {
                  value: ["텍스트", "오디오"],
                  label: "유형",
                  description: "",
                },
              },
            ],
          },
        },
      }),
    );
    const client = createClient(fetchMock);

    const result = await client.searchDatasets({
      keyword: "한국어",
      realmCode: "REALM002",
      classDetailCode: "DATACLDETAIL002",
      dataType: "DATA003",
      constructionYear: "2026",
      detailCondition: "DETAILCND003",
      limit: 10,
      offset: 20,
    });

    expect(result).toEqual({
      totalCount: 2,
      limit: 10,
      offset: 20,
      items: [
        {
          dataSetSn: "123",
          dataNm: "합성 한국어 데이터",
          url: "https://aihub.or.kr/example/123",
          dataTys: ["텍스트", "오디오"],
        },
      ],
    });

    const [requestUrl, requestInit] = readCall(fetchMock);
    const url = requestUrl as URL;
    expect(url.pathname).toBe("/mcp/dataSetList.do");
    expect(url.searchParams.get("searchKeyword")).toBe("한국어");
    expect(url.searchParams.get("srchDataRealmCode")).toBe("REALM002");
    expect(url.searchParams.get("srchdataClCode")).toBe("DATACL002");
    expect(url.searchParams.get("srchDataClDetailCode")).toBe("DATACLDETAIL002");
    expect(url.searchParams.get("recordCountPerPage")).toBe("10");
    expect(url.searchParams.get("firstIndex")).toBe("20");
    expect(new Headers(requestInit?.headers).get("X-API-KEY")).toBe("fake-test-key");
    expect(url.toString()).not.toContain("fake-test-key");
  });

  it("reads the server-side count without adding paging parameters", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        result: "SUCCESS",
        totalCount: { "총 개수": "37" },
        data: { list: { value: [] } },
      }),
    );
    const client = createClient(fetchMock);

    await expect(
      client.countDatasets({ realmCode: "REALM006" }),
    ).resolves.toBe(37);

    const url = readCall(fetchMock)[0] as URL;
    expect(url.pathname).toBe("/mcp/dataSetCnt.do");
    expect(url.searchParams.get("srchDataRealmCode")).toBe("REALM006");
    expect(url.searchParams.has("recordCountPerPage")).toBe(false);
    expect(url.searchParams.has("firstIndex")).toBe(false);
  });

  it("unwraps detail sections while preserving unknown fields", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        result: "SUCCESS",
        data: {
          "주요 정보": {
            dataSetSn: { value: "71787", label: "식별자", description: "" },
            dataNm: { value: "합성 상세 데이터", label: "이름", description: "" },
            url: {
              value: "https://aihub.or.kr/example/71787",
              label: "URL",
              description: "",
            },
          },
          "데이터 개요": {
            dataIntrcn: { value: "합성 소개", label: "소개", description: "" },
          },
          "새 섹션": {
            futureField: { value: 42, label: "미래 필드", description: "" },
          },
        },
      }),
    );
    const client = createClient(fetchMock);

    await expect(client.getDataset(71787)).resolves.toEqual({
      "주요 정보": {
        dataSetSn: "71787",
        dataNm: "합성 상세 데이터",
        url: "https://aihub.or.kr/example/71787",
      },
      "데이터 개요": { dataIntrcn: "합성 소개" },
      "새 섹션": { futureField: 42 },
    });
  });

  it("maps guide counts and guide dataset rows", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        result: "SUCCESS",
        data: {
          cnt: {
            value: [
              {
                FILESE001: { value: 12, label: "설명서", description: "" },
                FILESE002: { value: 8, label: "가이드", description: "" },
              },
            ],
          },
          list: {
            value: [
              {
                dataSetSn: { value: "900", label: "식별자", description: "" },
                dataNm: { value: "합성 가이드 데이터", label: "이름", description: "" },
                url: {
                  value: "https://aihub.or.kr/example/900",
                  label: "URL",
                  description: "",
                },
                cnvrSeCodeNm: {
                  value: "데이터 설명서",
                  label: "문서 유형",
                  description: "",
                },
              },
            ],
          },
        },
      }),
    );
    const client = createClient(fetchMock);

    const result = await client.getDatasetsWithGuide("manual", 5);

    expect(result.counts).toEqual({ manual: 12, guide: 8 });
    expect(result.datasets[0]).toMatchObject({
      dataSetSn: "900",
      dataNm: "합성 가이드 데이터",
    });
    const url = readCall(fetchMock)[0] as URL;
    expect(url.pathname).toBe("/mcp/getDataSetsWithGuide.do");
    expect(url.searchParams.get("srchGuideFileSe")).toBe("FILESE001");
    expect(url.searchParams.get("recordCountPerPage")).toBe("5");
  });

  it("returns a bounded API-change error without copying the response body", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        result: "SUCCESS",
        data: {
          changed: {
            secretLookingValue: "must-not-appear-in-error",
          },
        },
      }),
    );
    const client = createClient(fetchMock);

    const error = await client.searchDatasets({ limit: 1 }).catch((caught) => caught);

    expect(error).toBeInstanceOf(AihubError);
    expect((error as AihubError).code).toBe("AIHUB_API_CHANGED");
    expect((error as Error).message).toContain("API 응답 형식이 변경");
    expect((error as Error).message).not.toContain("must-not-appear-in-error");
  });

  it("classifies authorization failures without exposing the fake key", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("fake-test-key", { status: 403 }),
    );
    const client = createClient(fetchMock);

    const error = await client.countDatasets({}).catch((caught) => caught);

    expect(error).toBeInstanceOf(AihubError);
    expect((error as AihubError).code).toBe("AIHUB_AUTH_FAILED");
    expect((error as Error).message).not.toContain("fake-test-key");
  });
});

function createClient(fetchMock: ReturnType<typeof vi.fn>): AihubMetadataClient {
  return new AihubMetadataClient({
    config: () => fakeConfig,
    fetchImpl: fetchMock as unknown as typeof fetch,
  });
}

function readCall(
  fetchMock: ReturnType<typeof vi.fn>,
  index = 0,
): [RequestInfo | URL, RequestInit | undefined] {
  return fetchMock.mock.calls[index] as unknown as [
    RequestInfo | URL,
    RequestInit | undefined,
  ];
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
