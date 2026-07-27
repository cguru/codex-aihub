import { AihubError } from "../errors.js";
import type { DatasetFile, DatasetFileInventory } from "./types.js";

const DATASET_URL =
  "https://aihub.or.kr/aihubdata/data/view.do?currMenu=115&topMenu=100&aihubDataSe=data&dataSetSn=";

export function extractDatasetFileInventory(
  datasetId: number,
  dataset: Record<string, unknown>,
): DatasetFileInventory {
  const main = asRecord(dataset["주요 정보"]);
  const section = asRecord(dataset["파일 목록(API 다운로드)"]);
  const rawFiles = section?.fileList;

  if (!Array.isArray(rawFiles)) {
    throw new AihubError(
      "AIHUB_API_CHANGED",
      "AI Hub 상세 응답에서 다운로드 파일 목록을 찾지 못했습니다.",
      { endpoint: "/mcp/dataSetDetail.do" },
    );
  }

  const files = rawFiles.map((value, index) => parseFile(value, index));
  return {
    datasetId,
    datasetName: asNonEmptyString(main?.dataNm),
    datasetUrl:
      asNonEmptyString(main?.url) ?? `${DATASET_URL}${encodeURIComponent(datasetId)}`,
    files,
  };
}

function parseFile(value: unknown, index: number): DatasetFile {
  const row = asRecord(value);
  const fileId = asPositiveInteger(row?.fileSn);
  const sizeBytes = asNonNegativeInteger(row?.fileSize);
  const path = asNonEmptyString(row?.fileStreCours);
  const name = asNonEmptyString(row?.streFileNm);

  if (
    fileId === null ||
    sizeBytes === null ||
    path === null ||
    name === null
  ) {
    throw new AihubError(
      "AIHUB_API_CHANGED",
      `AI Hub 다운로드 파일 목록의 ${index + 1}번째 항목 형식이 변경되었습니다.`,
      { endpoint: "/mcp/dataSetDetail.do" },
    );
  }

  return { fileId, name, path, sizeBytes };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized || null;
}

function asPositiveInteger(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function asNonNegativeInteger(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}
