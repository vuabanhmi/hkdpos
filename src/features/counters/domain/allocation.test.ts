import { describe, expect, it } from "vitest";
import { allocateOrderDiscount, computeGrossAmount, computeNetAmount } from "./allocation";

describe("allocateOrderDiscount", () => {
  it("phân bổ theo tỷ lệ line_total, dồn phần dư vào dòng cuối", () => {
    // subtotal = 35.000 (20.000 + 15.000), giảm 1.000
    const result = allocateOrderDiscount([20000, 15000], 1000, 35000);
    expect(result).toEqual([571, 429]);
    expect(result[0] + result[1]).toBe(1000);
  });

  it("subtotal hoặc discountTotal = 0 thì mọi dòng phân bổ 0", () => {
    expect(allocateOrderDiscount([10000, 5000], 0, 15000)).toEqual([0, 0]);
    expect(allocateOrderDiscount([], 1000, 0)).toEqual([]);
  });

  it("tổng phân bổ luôn khớp đúng discountTotal với nhiều dòng", () => {
    const lineTotals = [1000, 2000, 3000, 4000];
    const result = allocateOrderDiscount(lineTotals, 777, 10000);
    expect(result.reduce((a, b) => a + b, 0)).toBe(777);
  });

  it("một dòng duy nhất nhận toàn bộ giảm giá", () => {
    expect(allocateOrderDiscount([10000], 1500, 10000)).toEqual([1500]);
  });
});

describe("computeGrossAmount", () => {
  it("tính đúng số lượng x đơn giá, làm tròn đồng", () => {
    expect(computeGrossAmount({ quantity: 2, unitPrice: 10000 })).toBe(20000);
    expect(computeGrossAmount({ quantity: 1.5, unitPrice: 9999 })).toBe(14999);
  });
});

describe("computeNetAmount", () => {
  it("tính đúng doanh thu thực = gộp - giảm dòng - phân bổ giảm đơn", () => {
    const line = { quantity: 2, unitPrice: 10000, discount: 500, allocatedOrderDiscount: 571 };
    expect(computeNetAmount(line)).toBe(20000 - 500 - 571);
  });
});
