import { describe, expect, it } from "vitest";
import { computeWeightedAverageCost, priceOutgoingMovement } from "./average-cost";

describe("computeWeightedAverageCost", () => {
  it("nhập lần đầu (chưa có tồn) thì giá vốn bình quân = giá nhập", () => {
    expect(computeWeightedAverageCost(0, 0, 10, 1000)).toBe(1000);
  });

  it("nhập lần hai với giá khác nhau tính đúng bình quân gia quyền", () => {
    // 10 x 1.000 rồi 5 x 1.600 -> (10*1000 + 5*1600) / 15 = 1200
    const afterFirst = computeWeightedAverageCost(0, 0, 10, 1000);
    const afterSecond = computeWeightedAverageCost(10, afterFirst, 5, 1600);
    expect(afterSecond).toBe(1200);
  });

  it("tồn hiện tại cộng số nhập <= 0 thì lấy giá nhập làm bình quân mới", () => {
    expect(computeWeightedAverageCost(-5, 2000, 5, 900)).toBe(900);
  });

  it("làm tròn về số nguyên đồng", () => {
    // (10*1000 + 3*1333) / 13 = 1076.84... -> 1077
    expect(computeWeightedAverageCost(10, 1000, 3, 1333)).toBe(1077);
  });
});

describe("priceOutgoingMovement", () => {
  it("luôn trả về đúng giá vốn hiện tại, không đổi", () => {
    expect(priceOutgoingMovement(1200)).toBe(1200);
  });
});
