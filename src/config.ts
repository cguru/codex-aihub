import { AihubError } from "./errors.js";

export interface AihubConfig {
  apiKey: string;
  metadataBaseUrl: string;
  timeoutMs: number;
}

const DEFAULT_METADATA_BASE_URL = "https://aihub.or.kr";
const DEFAULT_TIMEOUT_MS = 20_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): AihubConfig {
  const apiKey = env.AIHUB_API_KEY?.trim();
  if (!apiKey) {
    throw new AihubError(
      "AIHUB_API_KEY_MISSING",
      "AIHUB_API_KEY가 설정되지 않았습니다. https://aihub.or.kr/devsport/apishell/list.do 에서 개인 API 키를 발급받아 로컬 환경변수에 설정한 뒤 Codex를 다시 시작하세요. API 키는 채팅에 붙여넣지 마세요.",
    );
  }

  const metadataBaseUrl = normalizeBaseUrl(
    env.AIHUB_METADATA_BASE_URL ?? DEFAULT_METADATA_BASE_URL,
  );
  const timeoutMs = parseTimeout(env.AIHUB_REQUEST_TIMEOUT_MS);

  return { apiKey, metadataBaseUrl, timeoutMs };
}

function normalizeBaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch (cause) {
    throw new AihubError(
      "AIHUB_INVALID_CONFIG",
      "AIHUB_METADATA_BASE_URL이 올바른 URL이 아닙니다.",
      { cause },
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new AihubError(
      "AIHUB_INVALID_CONFIG",
      "AIHUB_METADATA_BASE_URL은 http 또는 https URL이어야 합니다.",
    );
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function parseTimeout(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_TIMEOUT_MS;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_TIMEOUT_MS || parsed > MAX_TIMEOUT_MS) {
    throw new AihubError(
      "AIHUB_INVALID_CONFIG",
      `AIHUB_REQUEST_TIMEOUT_MS는 ${MIN_TIMEOUT_MS}~${MAX_TIMEOUT_MS} 사이의 정수여야 합니다.`,
    );
  }
  return parsed;
}
