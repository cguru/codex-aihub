import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { AihubError } from "../src/errors.js";

describe("loadConfig", () => {
  it("requires the API key without including any candidate value in the error", () => {
    expect(() => loadConfig({})).toThrowError(AihubError);

    try {
      loadConfig({});
    } catch (error) {
      expect((error as AihubError).code).toBe("AIHUB_API_KEY_MISSING");
      expect((error as AihubError).message).toContain(
        "https://aihub.or.kr/devsport/apishell/list.do",
      );
      expect((error as AihubError).message).toContain(
        "채팅에 붙여넣지 마세요",
      );
    }
  });

  it("uses stable defaults and trims the key", () => {
    expect(loadConfig({ AIHUB_API_KEY: "  fake-key  " })).toEqual({
      apiKey: "fake-key",
      metadataBaseUrl: "https://aihub.or.kr",
      timeoutMs: 20_000,
    });
  });

  it("rejects unsafe schemes and out-of-range timeouts", () => {
    expect(() =>
      loadConfig({
        AIHUB_API_KEY: "fake-key",
        AIHUB_METADATA_BASE_URL: "file:///tmp/api",
      }),
    ).toThrow(/http 또는 https/);

    expect(() =>
      loadConfig({
        AIHUB_API_KEY: "fake-key",
        AIHUB_REQUEST_TIMEOUT_MS: "999",
      }),
    ).toThrow(/1000~120000/);
  });
});
