import { parseMoney } from "@/lib/money";
import { PRODUCT_CODE_PATTERN } from "./product";

/** Một dòng thô đọc từ file Excel, trước khi tra cứu id theo tên. */
export interface RawProductImportRow {
  rowNumber: number;
  code: string;
  name: string;
  barcode?: string | null;
  unitName: string;
  groupName?: string | null;
  taxCategoryName?: string | null;
  trackStock?: string | null;
  costPrice?: string | null;
  note?: string | null;
}

export interface ProductImportLookups {
  /** tên (đã chuẩn hóa chữ thường, bỏ khoảng trắng dư) -> id */
  unitIdByName: Map<string, string>;
  groupIdByName: Map<string, string>;
  taxCategoryIdByName: Map<string, string>;
  /** mã sản phẩm đã có trong DB (chữ thường) -> id, để biết dòng này là thêm mới hay cập nhật */
  existingProductIdByCode: Map<string, string>;
}

export interface ValidatedProductImportRow {
  existingProductId: string | null;
  code: string;
  name: string;
  barcode: string | null;
  unitId: string;
  groupId: string | null;
  taxCategoryId: string | null;
  trackStock: boolean;
  costPrice: number;
  note: string | null;
}

export interface ProductImportRowResult {
  rowNumber: number;
  ok: boolean;
  errors: string[];
  data?: ValidatedProductImportRow;
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function parseTrackStock(value: string | null | undefined): boolean {
  if (!value) return true;
  const normalized = normalizeKey(value);
  return !["không", "khong", "false", "0", "no"].includes(normalized);
}

/**
 * Validate một dòng import theo đúng ràng buộc của bảng products.
 * seenCodes dùng để phát hiện mã trùng nhau trong cùng file (tích lũy qua các lần gọi).
 */
export function validateProductImportRow(
  row: RawProductImportRow,
  lookups: ProductImportLookups,
  seenCodes: Set<string>,
): ProductImportRowResult {
  const errors: string[] = [];

  const code = row.code?.trim() ?? "";
  const name = row.name?.trim() ?? "";
  const unitName = row.unitName?.trim() ?? "";

  if (!code) {
    errors.push("Thiếu mã sản phẩm");
  } else if (!PRODUCT_CODE_PATTERN.test(code)) {
    errors.push("Mã chỉ gồm chữ, số, '.', '_', '-', không có khoảng trắng");
  } else if (code.length > 32) {
    errors.push("Mã sản phẩm tối đa 32 ký tự");
  } else if (seenCodes.has(normalizeKey(code))) {
    errors.push(`Mã '${code}' bị lặp lại trong file`);
  }

  if (!name) {
    errors.push("Thiếu tên sản phẩm");
  }

  let unitId: string | null = null;
  if (!unitName) {
    errors.push("Thiếu đơn vị tính");
  } else {
    unitId = lookups.unitIdByName.get(normalizeKey(unitName)) ?? null;
    if (!unitId) {
      errors.push(`Đơn vị tính '${unitName}' không tồn tại`);
    }
  }

  let groupId: string | null = null;
  const groupName = row.groupName?.trim();
  if (groupName) {
    groupId = lookups.groupIdByName.get(normalizeKey(groupName)) ?? null;
    if (!groupId) {
      errors.push(`Nhóm sản phẩm '${groupName}' không tồn tại`);
    }
  }

  let taxCategoryId: string | null = null;
  const taxCategoryName = row.taxCategoryName?.trim();
  if (taxCategoryName) {
    taxCategoryId = lookups.taxCategoryIdByName.get(normalizeKey(taxCategoryName)) ?? null;
    if (!taxCategoryId) {
      errors.push(`Nhóm ngành nghề tính thuế '${taxCategoryName}' không tồn tại`);
    }
  }

  let costPrice = 0;
  const costPriceRaw = row.costPrice?.trim();
  if (costPriceRaw) {
    const parsed = parseMoney(costPriceRaw);
    if (parsed === null) {
      errors.push(`Giá vốn '${costPriceRaw}' không hợp lệ`);
    } else {
      costPrice = parsed;
    }
  }

  const barcode = row.barcode?.trim() || null;

  if (code && errors.length === 0) {
    seenCodes.add(normalizeKey(code));
  }

  if (errors.length > 0) {
    return { rowNumber: row.rowNumber, ok: false, errors };
  }

  return {
    rowNumber: row.rowNumber,
    ok: true,
    errors: [],
    data: {
      existingProductId: lookups.existingProductIdByCode.get(normalizeKey(code)) ?? null,
      code,
      name,
      barcode,
      unitId: unitId as string,
      groupId,
      taxCategoryId,
      trackStock: parseTrackStock(row.trackStock),
      costPrice,
      note: row.note?.trim() || null,
    },
  };
}

export interface ProductImportSummary {
  results: ProductImportRowResult[];
  hasErrors: boolean;
  validRows: ValidatedProductImportRow[];
}

/** Validate toàn bộ file: chỉ coi là có thể ghi khi KHÔNG có dòng lỗi nào (all-or-nothing). */
export function validateProductImportRows(
  rows: RawProductImportRow[],
  lookups: ProductImportLookups,
): ProductImportSummary {
  const seenCodes = new Set<string>();
  const results = rows.map((row) => validateProductImportRow(row, lookups, seenCodes));
  const hasErrors = results.some((r) => !r.ok);

  return {
    results,
    hasErrors,
    validRows: hasErrors ? [] : (results.map((r) => r.data).filter(Boolean) as ValidatedProductImportRow[]),
  };
}
