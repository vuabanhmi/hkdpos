export interface RawContactImportRow {
  rowNumber: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxCode?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  isCustomer?: string | null;
  isSupplier?: string | null;
  note?: string | null;
}

export interface ValidatedContactImportRow {
  existingContactId: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxCode: string | null;
  bankName: string | null;
  bankAccount: string | null;
  isCustomer: boolean;
  isSupplier: boolean;
  note: string | null;
}

export interface ContactImportRowResult {
  rowNumber: number;
  ok: boolean;
  errors: string[];
  data?: ValidatedContactImportRow;
}

function parseYesNo(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ["có", "co", "true", "1", "yes", "x"].includes(normalized);
}

export function validateContactImportRow(
  row: RawContactImportRow,
  existingContactIdByName: Map<string, string>,
): ContactImportRowResult {
  const errors: string[] = [];
  const name = row.name?.trim() ?? "";

  if (!name) {
    errors.push("Thiếu tên");
  }

  const isCustomer = parseYesNo(row.isCustomer);
  const isSupplier = parseYesNo(row.isSupplier);

  if (name && !isCustomer && !isSupplier) {
    errors.push("Phải chọn Khách hàng hoặc Nhà cung cấp");
  }

  if (errors.length > 0) {
    return { rowNumber: row.rowNumber, ok: false, errors };
  }

  return {
    rowNumber: row.rowNumber,
    ok: true,
    errors: [],
    data: {
      existingContactId: existingContactIdByName.get(name.toLowerCase()) ?? null,
      name,
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      address: row.address?.trim() || null,
      taxCode: row.taxCode?.trim() || null,
      bankName: row.bankName?.trim() || null,
      bankAccount: row.bankAccount?.trim() || null,
      isCustomer,
      isSupplier,
      note: row.note?.trim() || null,
    },
  };
}

export interface ContactImportSummary {
  results: ContactImportRowResult[];
  hasErrors: boolean;
  validRows: ValidatedContactImportRow[];
}

/** Khớp tên không phân biệt hoa thường để biết là thêm mới hay cập nhật — all-or-nothing nếu có lỗi. */
export function validateContactImportRows(
  rows: RawContactImportRow[],
  existingContactIdByName: Map<string, string>,
): ContactImportSummary {
  const results = rows.map((row) => validateContactImportRow(row, existingContactIdByName));
  const hasErrors = results.some((r) => !r.ok);

  return {
    results,
    hasErrors,
    validRows: hasErrors ? [] : (results.map((r) => r.data).filter(Boolean) as ValidatedContactImportRow[]),
  };
}
