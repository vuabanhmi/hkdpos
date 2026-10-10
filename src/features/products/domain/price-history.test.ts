import { describe, expect, it } from "vitest";
import { simulatePriceHistory, willRecordPriceHistory } from "./price-history";

describe("willRecordPriceHistory", () => {
  it("luôn ghi lịch sử khi thêm giá lần đầu (oldPrice = null)", () => {
    expect(willRecordPriceHistory(null, 10_000)).toBe(true);
  });

  it("ghi lịch sử khi giá mới khác giá cũ", () => {
    expect(willRecordPriceHistory(10_000, 12_000)).toBe(true);
  });

  it("không ghi lịch sử khi lưu lại đúng giá cũ", () => {
    expect(willRecordPriceHistory(10_000, 10_000)).toBe(false);
  });
});

describe("simulatePriceHistory", () => {
  it("chỉ sinh dòng lịch sử ở các lần giá thực sự thay đổi", () => {
    const entries = simulatePriceHistory([10_000, 10_000, 12_000, 12_000, 9_000]);

    expect(entries).toEqual([
      { oldPrice: null, newPrice: 10_000 },
      { oldPrice: 10_000, newPrice: 12_000 },
      { oldPrice: 12_000, newPrice: 9_000 },
    ]);
  });

  it("mảng rỗng không sinh dòng nào", () => {
    expect(simulatePriceHistory([])).toEqual([]);
  });
});
