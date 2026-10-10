import { describe, expect, it } from "vitest";
import { productInputSchema } from "./product";

const UNIT_ID = "11111111-1111-4111-8111-111111111111";

describe("productInputSchema", () => {
  it("chấp nhận dữ liệu hợp lệ tối thiểu", () => {
    const result = productInputSchema.safeParse({
      code: "SP001",
      name: "Cà phê đen",
      unitId: UNIT_ID,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.trackStock).toBe(true);
      expect(result.data.costPrice).toBe(0);
      expect(result.data.barcode).toBeNull();
    }
  });

  it("từ chối mã có khoảng trắng hoặc ký tự lạ", () => {
    expect(productInputSchema.safeParse({ code: "SP 001", name: "x", unitId: UNIT_ID }).success).toBe(false);
    expect(productInputSchema.safeParse({ code: "SP@001", name: "x", unitId: UNIT_ID }).success).toBe(false);
  });

  it("chấp nhận mã rỗng (hệ thống sẽ tự sinh mã)", () => {
    expect(productInputSchema.safeParse({ code: "", name: "x", unitId: UNIT_ID }).success).toBe(true);
    expect(productInputSchema.safeParse({ code: "  ", name: "x", unitId: UNIT_ID }).success).toBe(true);
  });

  it("từ chối thiếu tên hoặc thiếu đơn vị tính", () => {
    expect(productInputSchema.safeParse({ code: "SP001", name: "", unitId: UNIT_ID }).success).toBe(false);
    expect(productInputSchema.safeParse({ code: "SP001", name: "x" }).success).toBe(false);
  });

  it("từ chối giá vốn âm hoặc không nguyên", () => {
    expect(
      productInputSchema.safeParse({ code: "SP001", name: "x", unitId: UNIT_ID, costPrice: -1 }).success,
    ).toBe(false);
    expect(
      productInputSchema.safeParse({ code: "SP001", name: "x", unitId: UNIT_ID, costPrice: 1.5 }).success,
    ).toBe(false);
  });

  it("chuyển chuỗi rỗng ở barcode/note thành null", () => {
    const result = productInputSchema.safeParse({
      code: "SP001",
      name: "x",
      unitId: UNIT_ID,
      barcode: "",
      note: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.barcode).toBeNull();
      expect(result.data.note).toBeNull();
    }
  });
});
