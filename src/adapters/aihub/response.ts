import { AihubError } from "../../errors.js";

type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

export function requireEnvelope(value: unknown, endpoint: string): JsonRecord {
  const envelope = asRecord(value);
  if (!envelope) {
    throw apiChanged(endpoint, value);
  }
  return envelope;
}

export function throwIfFailed(
  envelope: JsonRecord,
  endpoint: string,
  apiKey: string,
): void {
  const result = envelope.result;
  if (typeof result !== "string" || result.trim().toUpperCase() !== "FAIL") {
    return;
  }

  const upstreamMessage =
    typeof envelope.message === "string"
      ? envelope.message.split(apiKey).join("[REDACTED]")
      : "AI Hub가 요청을 거부했습니다.";

  throw new AihubError(
    "AIHUB_REQUEST_FAILED",
    upstreamMessage,
    { endpoint },
  );
}

export function unwrapFieldValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(unwrapFieldValues);
  }

  const record = asRecord(value);
  if (!record) {
    return value;
  }

  if (isFieldWrapper(record)) {
    return unwrapFieldValues(record.value);
  }

  return Object.fromEntries(
    Object.entries(record).map(([key, nested]) => [
      key,
      unwrapFieldValues(nested),
    ]),
  );
}

export function extractList(
  envelope: JsonRecord,
  endpoint: string,
): Array<Record<string, unknown>> {
  const data = asRecord(envelope.data);
  const list = data ? asRecord(data.list) : null;
  const rows = list?.value;
  if (!Array.isArray(rows)) {
    throw apiChanged(endpoint, envelope);
  }

  return rows.map((row) => {
    const unwrapped = unwrapFieldValues(row);
    const record = asRecord(unwrapped);
    if (!record) {
      throw apiChanged(endpoint, row);
    }
    return record;
  });
}

export function extractTotalCount(
  envelope: JsonRecord,
  endpoint: string,
  fallback?: number,
): number {
  const totalCount = asRecord(envelope.totalCount);
  const value = totalCount?.["총 개수"];
  const parsed = toNonNegativeInteger(value);
  if (parsed !== null) {
    return parsed;
  }
  if (fallback !== undefined) {
    return fallback;
  }
  throw apiChanged(endpoint, envelope);
}

export function extractDetail(
  envelope: JsonRecord,
  endpoint: string,
): Record<string, unknown> | null {
  if (envelope.data === null || envelope.data === undefined) {
    return null;
  }
  const detail = asRecord(unwrapFieldValues(envelope.data));
  if (!detail) {
    throw apiChanged(endpoint, envelope);
  }
  return Object.keys(detail).length === 0 ? null : detail;
}

export function extractGuideCounts(
  envelope: JsonRecord,
  endpoint: string,
): { manual: number | null; guide: number | null } {
  const data = asRecord(envelope.data);
  const cnt = data ? asRecord(data.cnt) : null;
  const entries = cnt?.value;
  if (!Array.isArray(entries)) {
    throw apiChanged(endpoint, envelope);
  }

  let manual: number | null = null;
  let guide: number | null = null;

  for (const entry of entries) {
    const record = asRecord(entry);
    if (!record) {
      continue;
    }
    const manualField = asRecord(record.FILESE001);
    const guideField = asRecord(record.FILESE002);
    manual ??= toNonNegativeInteger(manualField?.value);
    guide ??= toNonNegativeInteger(guideField?.value);
  }

  return { manual, guide };
}

function isFieldWrapper(record: JsonRecord): boolean {
  if (!Object.prototype.hasOwnProperty.call(record, "value")) {
    return false;
  }
  const keys = Object.keys(record);
  return (
    keys.every((key) => key === "value" || key === "label" || key === "description") ||
    Object.prototype.hasOwnProperty.call(record, "label") ||
    Object.prototype.hasOwnProperty.call(record, "description")
  );
}

function toNonNegativeInteger(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function apiChanged(endpoint: string, value: unknown): AihubError {
  return new AihubError(
    "AIHUB_API_CHANGED",
    `AI Hub API 응답 형식이 변경되었을 수 있습니다. (${describeShape(value)})`,
    { endpoint },
  );
}

function describeShape(value: unknown): string {
  if (Array.isArray(value)) {
    return `array(${value.length})`;
  }
  const record = asRecord(value);
  if (record) {
    const keys = Object.keys(record).slice(0, 12);
    return `object keys: ${keys.join(", ") || "(none)"}`;
  }
  return typeof value;
}
