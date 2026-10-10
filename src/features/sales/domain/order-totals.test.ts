import { describe, expect, it } from "vitest";
import { computeDebt, computeLineTotal, computeOrderTotals } from "./order-totals";

describe("computeLineTotal", () => {
  it("tính đúng số lượng x đơn giá - giảm giá dòng", () => {
    expect(computeLineTotal({ quantity: 2, unitPrice: 15000, discount: 1000 })).toBe(29000);
  });

  it("làm tròn tiền dòng khi số lượng có phần thập phân", () => {
    // 1.5 x 9.999 = 14.998,5 -> 14.999
    expect(computeLineTotal({ quantity: 1.5, unitPrice: 9999, discount: 0 })).toBe(14999);
  });

  it("không âm dù giảm giá dòng lớn hơn giá trị dòng", () => {
    expect(computeLineTotal({ quantity: 1, unitPrice: 1000, discount: 5000 })).toBe(0);
  });
});

describe("computeOrderTotals", () => {
  it("tính đúng subtotal và total sau giảm giá cả đơn", () => {
    const result = computeOrderTotals(
      [{ quantity: 2, unitPrice: 15000, discount: 1000 }],
      2000,
    );
    expect(result).toEqual({ subtotal: 29000, discountTotal: 2000, total: 27000 });
  });

  it("giảm giá cả đơn không vượt quá subtotal", () => {
    const result = computeOrderTotals([{ quantity: 1, unitPrice: 10000, discount: 0 }], 999999);
    expect(result).toEqual({ subtotal: 10000, discountTotal: 10000, total: 0 });
  });

  it("giỏ hàng rỗng thì mọi thứ bằng 0", () => {
    expect(computeOrderTotals([], 0)).toEqual({ subtotal: 0, discountTotal: 0, total: 0 });
  });
});

describe("computeDebt", () => {
  it("trả đủ thì công nợ = 0", () => {
    expect(computeDebt(27000, 27000)).toBe(0);
  });

  it("trả thiếu thì công nợ = phần còn lại", () => {
    expect(computeDebt(27000, 20000)).toBe(7000);
  });

  it("trả dư thì công nợ không âm", () => {
    expect(computeDebt(27000, 30000)).toBe(0);
  });
});
