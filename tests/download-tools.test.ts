import { describe, expect, it } from "vitest";
import { formatApproximateBytes } from "../src/tools/downloads.js";

describe("download tool messages", () => {
  it("shows rounded approximate decimal sizes for people", () => {
    expect(formatApproximateBytes(586_720_624_640)).toBe("약 590GB");
    expect(formatApproximateBytes(2_532_921_144_222)).toBe("약 2.5TB");
    expect(formatApproximateBytes(900_000_000)).toBe("약 900MB");
  });
});
