import { describe, expect, it } from "vitest";
import { safeFileName } from "./ProjectPanel";

describe("ProjectPanel file names", () => {
  it("keeps readable Unicode titles instead of falling back to a generic file name", () => {
    expect(safeFileName("自定义坦克")).toBe("自定义坦克");
    expect(safeFileName("CUSTOM TANK")).toBe("custom-tank");
    expect(safeFileName("  T-70 / Elite  ")).toBe("t-70-elite");
  });

  it("uses the generic file name only when a title has no usable letters or numbers", () => {
    expect(safeFileName("!!!")).toBe("custom-card");
  });
});
