import { describe, expect, it } from "vitest";
import {
  type ProductImportLookups,
  type RawProductImportRow,
  validateProductImportRow,
  validateProductImportRows,
} from "./import";

function makeLookups(overrides: Partial<ProductImportLookups> = {}): ProductImportLookups {
  return {
    unitIdByName: new Map([["cái", "unit-1"]]),
    groupIdByName: new Map([["đồ uống", "group-1"]]),
    taxCategoryIdByName: new Map([["dịch vụ ăn uống", "tax-1"]]),
    existingProductIdByCode: new Map(),
    ...overrides,
  };
}

function row(overrides: Partial<RawProductImportRow> = {}): RawProductImportRow {
  return {
    rowNumber: 2,
    code: "SP001",
    name: "Cà phê đen",
    unitName: "Cái",
    ...overrides,
  };
}

describe("validateProductImportRow", () => {
  it("hợp lệ với dòng đầy đủ, đúng dữ liệu tra cứu", () => {
    const result = validateProductImportRow(row(), makeLookups(), new Set());

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      code: "SP001",
      unitId: "unit-1",
      existingProductId: null,
    });
  });

  it("báo lỗi thiếu mã, thiếu tên, thiếu đơn vị", () => {
    const result = validateProductImportRow(
      row({ code: "", name: "", unitName: "" }),
      makeLookups(),
      new Set(),
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining(["Thiếu mã sản phẩm", "Thiếu tên sản phẩm", "Thiếu đơn vị tính"]),
    );
  });

  it("báo lỗi khi đơn vị, nhóm, nhóm thuế không tồn tại", () => {
    const result = validateProductImportRow(
      row({ unitName: "Thùng", groupName: "Lạ", taxCategoryName: "Lạ" }),
      makeLookups(),
      new Set(),
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual([
      "Đơn vị tính 'Thùng' không tồn tại",
      "Nhóm sản phẩm 'Lạ' không tồn tại",
      "Nhóm ngành nghề tính thuế 'Lạ' không tồn tại",
    ]);
  });

  it("báo lỗi mã trùng trong file", () => {
    const seenCodes = new Set<string>(["sp001"]);
    const result = validateProductImportRow(row(), makeLookups(), seenCodes);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Mã 'SP001' bị lặp lại trong file");
  });

  it("nhận diện dòng cập nhật sản phẩm đã có (trùng mã với DB)", () => {
    const lookups = makeLookups({ existingProductIdByCode: new Map([["sp001", "product-1"]]) });
    const result = validateProductImportRow(row(), lookups, new Set());

    expect(result.ok).toBe(true);
    expect(result.data?.existingProductId).toBe("product-1");
  });

  it("parse giá vốn có dấu chấm ngăn nghìn, báo lỗi nếu không hợp lệ", () => {
    const ok = validateProductImportRow(row({ costPrice: "1.234.567" }), makeLookups(), new Set());
    expect(ok.ok).toBe(true);
    expect(ok.data?.costPrice).toBe(1_234_567);

    const bad = validateProductImportRow(row({ costPrice: "abc" }), makeLookups(), new Set());
    expect(bad.ok).toBe(false);
    expect(bad.errors).toContain("Giá vốn 'abc' không hợp lệ");
  });

  it("trackStock mặc định true, 'Không' thì false", () => {
    const def = validateProductImportRow(row(), makeLookups(), new Set());
    expect(def.data?.trackStock).toBe(true);

    const off = validateProductImportRow(row({ trackStock: "Không" }), makeLookups(), new Set());
    expect(off.data?.trackStock).toBe(false);
  });
});

describe("validateProductImportRows", () => {
  it("validRows rỗng nếu có bất kỳ dòng lỗi (all-or-nothing)", () => {
    const summary = validateProductImportRows(
      [row({ rowNumber: 2 }), row({ rowNumber: 3, code: "" })],
      makeLookups(),
    );

    expect(summary.hasErrors).toBe(true);
    expect(summary.validRows).toEqual([]);
    expect(summary.results).toHaveLength(2);
  });

  it("trả về đủ validRows khi tất cả các dòng hợp lệ", () => {
    const summary = validateProductImportRows(
      [row({ rowNumber: 2, code: "SP001" }), row({ rowNumber: 3, code: "SP002" })],
      makeLookups(),
    );

    expect(summary.hasErrors).toBe(false);
    expect(summary.validRows).toHaveLength(2);
  });
});
