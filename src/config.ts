import { AihubError } from "./errors.js";

export interface AihubConfig {
  apiKey: string;
  metadataBaseUrl: string;
  downloadBaseUrl: string;
  downloadVersion: string;
  timeoutMs: number;
  downloadTimeoutMs: number;
}

const DEFAULT_METADATA_BASE_URL = "https://aihub.or.kr";
const DEFAULT_DOWNLOAD_BASE_URL = "https://api.aihub.or.kr";
const DEFAULT_DOWNLOAD_VERSION = "0.6";
const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_DOWNLOAD_TIMEOUT_MS = 3_600_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;
const MAX_DOWNLOAD_TIMEOUT_MS = 86_400_000;

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): AihubConfig {
  const apiKey = normalizeApiKey(env.AIHUB_API_KEY);
  if (!apiKey) {
    throw new AihubError(
      "AIHUB_API_KEY_MISSING",
      "AIHUB_API_KEY가 설정되지 않았습니다. https://aihub.or.kr/devsport/apishell/list.do 에서 개인 API 키를 발급받아 로컬 환경변수에 설정한 뒤 Codex를 다시 시작하세요. API 키는 채팅에 붙여넣지 마세요.",
    );
  }

  const metadataBaseUrl = normalizeBaseUrl(
    env.AIHUB_METADATA_BASE_URL ?? DEFAULT_METADATA_BASE_URL,
    "AIHUB_METADATA_BASE_URL",
  );
  const downloadBaseUrl = normalizeBaseUrl(
    env.AIHUB_DOWNLOAD_BASE_URL ?? DEFAULT_DOWNLOAD_BASE_URL,
    "AIHUB_DOWNLOAD_BASE_URL",
  );
  const downloadVersion = parseDownloadVersion(env.AIHUB_DOWNLOAD_VERSION);
  const timeoutMs = parseTimeout(
    env.AIHUB_REQUEST_TIMEOUT_MS,
    "AIHUB_REQUEST_TIMEOUT_MS",
    MAX_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
  );
  const downloadTimeoutMs = parseTimeout(
    env.AIHUB_DOWNLOAD_TIMEOUT_MS,
    "AIHUB_DOWNLOAD_TIMEOUT_MS",
    MAX_DOWNLOAD_TIMEOUT_MS,
    DEFAULT_DOWNLOAD_TIMEOUT_MS,
  );

  return {
    apiKey,
    metadataBaseUrl,
    downloadBaseUrl,
    downloadVersion,
    timeoutMs,
    downloadTimeoutMs,
  };
}

function normalizeApiKey(value: string | undefined): string | undefined {
  let normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  const assignment = normalized.match(
    /^(?:AIHUB_API_KEY|AIHUB_KEY)\s*=\s*(.+)$/i,
  );
  if (assignment?.[1]) {
    normalized = assignment[1].trim();
  }

  const quote = normalized[0];
  if (
    normalized.length >= 2 &&
    (quote === '"' || quote === "'") &&
    normalized.at(-1) === quote
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized || undefined;
}

function normalizeBaseUrl(value: string, variableName: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch (cause) {
    throw new AihubError(
      "AIHUB_INVALID_CONFIG",
      `${variableName}이 올바른 URL이 아닙니다.`,
      { cause },
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new AihubError(
      "AIHUB_INVALID_CONFIG",
      `${variableName}은 http 또는 https URL이어야 합니다.`,
    );
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function parseDownloadVersion(value: string | undefined): string {
  const normalized = value?.trim() || DEFAULT_DOWNLOAD_VERSION;
  if (!/^\d+(?:\.\d+){1,2}$/.test(normalized)) {
    throw new AihubError(
      "AIHUB_INVALID_CONFIG",
      "AIHUB_DOWNLOAD_VERSION은 0.6과 같은 숫자 버전이어야 합니다.",
    );
  }
  return normalized;
}

function parseTimeout(
  value: string | undefined,
  variableName: string,
  max: number,
  defaultValue: number,
): number {
  if (value === undefined || value.trim() === "") {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_TIMEOUT_MS || parsed > max) {
    throw new AihubError(
      "AIHUB_INVALID_CONFIG",
      `${variableName}는 ${MIN_TIMEOUT_MS}~${max} 사이의 정수여야 합니다.`,
    );
  }
  return parsed;
}
