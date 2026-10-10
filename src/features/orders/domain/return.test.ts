import { describe, expect, it } from "vitest";
import { computeRemainingReturnable, computeReturnAmount } from "./return";

describe("computeReturnAmount", () => {
  it("trả một phần tính đúng theo đơn giá hiệu lực (đã gồm giảm giá dòng)", () => {
    // Dòng gốc: 5 cái, line_total 50.000 -> đơn giá hiệu lực 10.000, trả 2 -> 20.000
    expect(computeReturnAmount(5, 50000, 2)).toBe(20000);
  });

  it("trả toàn bộ thì bằng đúng line_total gốc", () => {
    expect(computeReturnAmount(5, 50000, 5)).toBe(50000);
  });

  it("làm tròn khi đơn giá hiệu lực không chia hết", () => {
    // line_total 29.000 / 2 = 14.500 (chia hết, kiểm thêm trường hợp lẻ)
    expect(computeReturnAmount(3, 10000, 1)).toBe(3333);
  });

  it("số lượng gốc = 0 thì trả về 0 (không chia cho 0)", () => {
    expect(computeReturnAmount(0, 0, 0)).toBe(0);
  });
});

describe("computeRemainingReturnable", () => {
  it("tính đúng số lượng còn có thể trả", () => {
    expect(computeRemainingReturnable(5, 2)).toBe(3);
  });

  it("không âm khi đã trả hết hoặc trả vượt (dữ liệu bất thường)", () => {
    expect(computeRemainingReturnable(5, 5)).toBe(0);
    expect(computeRemainingReturnable(5, 7)).toBe(0);
  });
});
