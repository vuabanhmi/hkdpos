import { describe, expect, it } from "vitest";
import { validateContactImportRow, validateContactImportRows } from "./import";

function row(overrides: Record<string, unknown> = {}) {
  return { rowNumber: 2, name: "Chị Lan", isCustomer: "Có", ...overrides };
}

describe("validateContactImportRow", () => {
  it("hợp lệ khi có tên và ít nhất một loại", () => {
    const result = validateContactImportRow(row(), new Map());
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ name: "Chị Lan", isCustomer: true, isSupplier: false });
  });

  it("báo lỗi thiếu tên", () => {
    const result = validateContactImportRow(row({ name: "" }), new Map());
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Thiếu tên");
  });

  it("báo lỗi khi không chọn khách hàng hoặc nhà cung cấp", () => {
    const result = validateContactImportRow(row({ isCustomer: null }), new Map());
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Phải chọn Khách hàng hoặc Nhà cung cấp");
  });

  it("nhận diện dòng cập nhật qua tên đã tồn tại", () => {
    const result = validateContactImportRow(row(), new Map([["chị lan", "contact-1"]]));
    expect(result.data?.existingContactId).toBe("contact-1");
  });
});

describe("validateContactImportRows", () => {
  it("all-or-nothing: có lỗi thì validRows rỗng", () => {
    const summary = validateContactImportRows(
      [row({ rowNumber: 2 }), row({ rowNumber: 3, name: "" })],
      new Map(),
    );
    expect(summary.hasErrors).toBe(true);
    expect(summary.validRows).toEqual([]);
  });
});
