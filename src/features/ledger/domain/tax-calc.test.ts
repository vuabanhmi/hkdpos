import { describe, expect, it } from "vitest";
import {
  computeGtgtAmount,
  computeRevenueThresholdStatus,
  computeTncnAmount,
  summarizeDeclaration,
} from "./tax-calc";

describe("computeGtgtAmount / computeTncnAmount", () => {
  it("tính đúng thuế theo tỷ lệ, làm tròn đến đồng", () => {
    expect(computeGtgtAmount(200000, 0.05)).toBe(10000);
    expect(computeTncnAmount(200000, 0.02)).toBe(4000);
  });

  it("làm tròn khi kết quả có phần lẻ", () => {
    expect(computeGtgtAmount(100001, 0.05)).toBe(5000); // 5000.05 -> 5000
    expect(computeGtgtAmount(100030, 0.05)).toBe(5002); // 5001.5 -> 5002 (round half up)
  });

  it("doanh thu hoặc tỷ lệ = 0 thì thuế = 0", () => {
    expect(computeGtgtAmount(0, 0.05)).toBe(0);
    expect(computeGtgtAmount(200000, 0)).toBe(0);
  });
});

describe("summarizeDeclaration", () => {
  it("cộng đúng tổng doanh thu và thuế qua nhiều nhóm ngành nghề", () => {
    const totals = summarizeDeclaration([
      { revenue: 200000, gtgtAmount: 10000, tncnAmount: 4000 },
      { revenue: 100000, gtgtAmount: 3000, tncnAmount: 1000 },
    ]);
    expect(totals).toEqual({ totalRevenue: 300000, totalGtgt: 13000, totalTncn: 5000 });
  });

  it("danh sách rỗng trả về tổng 0", () => {
    expect(summarizeDeclaration([])).toEqual({ totalRevenue: 0, totalGtgt: 0, totalTncn: 0 });
  });
});

describe("computeRevenueThresholdStatus", () => {
  it("dưới mức cảnh báo thì không cảnh báo", () => {
    const status = computeRevenueThresholdStatus(500_000_000, 1_000_000_000, 0.8);
    expect(status.isNearThreshold).toBe(false);
    expect(status.isOverThreshold).toBe(false);
  });

  it("đạt mức cảnh báo nhưng chưa vượt ngưỡng thì cảnh báo gần ngưỡng", () => {
    const status = computeRevenueThresholdStatus(850_000_000, 1_000_000_000, 0.8);
    expect(status.isNearThreshold).toBe(true);
    expect(status.isOverThreshold).toBe(false);
  });

  it("vượt ngưỡng thì isOverThreshold = true", () => {
    const status = computeRevenueThresholdStatus(1_200_000_000, 1_000_000_000, 0.8);
    expect(status.isNearThreshold).toBe(false);
    expect(status.isOverThreshold).toBe(true);
  });

  it("ngưỡng = 0 không chia cho 0", () => {
    const status = computeRevenueThresholdStatus(100, 0, 0.8);
    expect(status.percentUsed).toBe(0);
  });
});
