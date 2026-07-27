import { describe, expect, it } from "vitest";
import { extractDatasetFileInventory } from "../src/download/inventory.js";
import { AihubError } from "../src/errors.js";

describe("extractDatasetFileInventory", () => {
  it("normalizes the structured file list from dataset details", () => {
    const result = extractDatasetFileInventory(71362, {
      "주요 정보": {
        dataNm: "재활용품 분류 및 선별 데이터",
        url: "https://aihub.or.kr/example/71362",
      },
      "파일 목록(API 다운로드)": {
        fileList: [
          {
            fileSn: 482562,
            fileSize: 248_832,
            fileStreCours: "dataset/Validation/labels.zip",
            streFileNm: "labels.zip",
          },
        ],
      },
    });

    expect(result).toEqual({
      datasetId: 71362,
      datasetName: "재활용품 분류 및 선별 데이터",
      datasetUrl: "https://aihub.or.kr/example/71362",
      files: [
        {
          fileId: 482562,
          name: "labels.zip",
          path: "dataset/Validation/labels.zip",
          sizeBytes: 248_832,
        },
      ],
    });
  });

  it("fails closed when the upstream file shape changes", () => {
    expect(() =>
      extractDatasetFileInventory(1, {
        "파일 목록(API 다운로드)": { changed: [] },
      }),
    ).toThrowError(AihubError);
  });
});
