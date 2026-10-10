import { describe, expect, it } from "vitest";
import {
  computeDiffQty,
  computeDiffValue,
  filterStocktakeLines,
  summarizeStocktake,
  type StocktakeLineLike,
} from "./stocktake";

describe("computeDiffQty / computeDiffValue", () => {
  it("chưa đếm (counted null) thì chênh lệch = 0", () => {
    expect(computeDiffQty(115, null)).toBe(0);
    expect(computeDiffValue(115, null, 1000)).toBe(0);
  });

  it("đếm thiếu so với hệ thống ra chênh lệch âm", () => {
    expect(computeDiffQty(115, 110)).toBe(-5);
    expect(computeDiffValue(115, 110, 1000)).toBe(-5000);
  });

  it("đếm dư so với hệ thống ra chênh lệch dương", () => {
    expect(computeDiffQty(10, 12)).toBe(2);
    expect(computeDiffValue(10, 12, 1500)).toBe(3000);
  });

  it("làm tròn giá trị chênh lệch khi số lượng có phần lẻ", () => {
    expect(computeDiffValue(10, 10.3, 1000)).toBe(300);
  });
});

describe("summarizeStocktake", () => {
  const lines: StocktakeLineLike[] = [
    { systemQty: 115, countedQty: 110, unitCost: 1000 }, // đã đếm, chênh lệch -5.000
    { systemQty: 50, countedQty: 50, unitCost: 2000 }, // đã đếm, khớp
    { systemQty: 30, countedQty: null, unitCost: 500 }, // chưa đếm
  ];

  it("tính đúng số dòng đã đếm/chưa đếm/có chênh lệch và tổng giá trị chênh lệch", () => {
    const summary = summarizeStocktake(lines);
    expect(summary.totalLines).toBe(3);
    expect(summary.countedLines).toBe(2);
    expect(summary.uncountedLines).toBe(1);
    expect(summary.linesWithDiff).toBe(1);
    expect(summary.totalDiffValue).toBe(-5000);
  });

  it("danh sách rỗng trả về tổng 0", () => {
    expect(summarizeStocktake([])).toEqual({
      totalLines: 0,
      countedLines: 0,
      uncountedLines: 0,
      linesWithDiff: 0,
      totalDiffValue: 0,
    });
  });
});

describe("filterStocktakeLines", () => {
  const lines: StocktakeLineLike[] = [
    { systemQty: 115, countedQty: 110, unitCost: 1000 },
    { systemQty: 50, countedQty: 50, unitCost: 2000 },
    { systemQty: 30, countedQty: null, unitCost: 500 },
  ];

  it("all giữ nguyên danh sách", () => {
    expect(filterStocktakeLines(lines, "all")).toHaveLength(3);
  });

  it("uncounted chỉ lấy dòng chưa đếm", () => {
    const result = filterStocktakeLines(lines, "uncounted");
    expect(result).toHaveLength(1);
    expect(result[0].systemQty).toBe(30);
  });

  it("diff chỉ lấy dòng có chênh lệch (bỏ qua dòng chưa đếm)", () => {
    const result = filterStocktakeLines(lines, "diff");
    expect(result).toHaveLength(1);
    expect(result[0].systemQty).toBe(115);
  });
});
