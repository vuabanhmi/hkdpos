"use server";

import ExcelJS from "exceljs";
import { createSupabaseServerClient } from "@/lib/db/server";
import {
  type ContactImportSummary,
  type RawContactImportRow,
  type ValidatedContactImportRow,
  validateContactImportRows,
} from "@/features/contacts/domain/import";
import type { ActionResult } from "./contacts";

// Không export: file "use server" chỉ được export async function, export hằng số
// (dù chỉ dùng nội bộ file này) sẽ làm Next.js coi cả module là không có export hợp lệ.
const CONTACT_IMPORT_SHEET_NAME = "Đối tác";

const CONTACT_IMPORT_HEADERS = [
  "Tên",
  "Điện thoại",
  "Email",
  "Địa chỉ",
  "Mã số thuế",
  "Tên ngân hàng",
  "Số tài khoản",
  "Khách hàng (Có/Không)",
  "Nhà cung cấp (Có/Không)",
  "Ghi chú",
] as const;

export async function exportContactsToExcel(): Promise<ActionResult<{ base64: string; filename: string }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("name, phone, email, address, tax_code, bank_name, bank_account, is_customer, is_supplier, note")
    .order("name");

  if (error) return { ok: false, error: error.message };

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(CONTACT_IMPORT_SHEET_NAME);
  sheet.addRow(CONTACT_IMPORT_HEADERS as unknown as string[]);
  for (const row of data ?? []) {
    sheet.addRow([
      row.name,
      row.phone ?? "",
      row.email ?? "",
      row.address ?? "",
      row.tax_code ?? "",
      row.bank_name ?? "",
      row.bank_account ?? "",
      row.is_customer ? "Có" : "Không",
      row.is_supplier ? "Có" : "Không",
      row.note ?? "",
    ]);
  }
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    col.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    ok: true,
    data: {
      base64: Buffer.from(buffer).toString("base64"),
      filename: `doi-tac-${new Date().toISOString().slice(0, 10)}.xlsx`,
    },
  };
}

interface GuideRow {
  column: string;
  required: string;
  format: string;
  example: string;
}

function writeGuideSheet(workbook: ExcelJS.Workbook, title: string, rows: GuideRow[], note: string) {
  const sheet = workbook.addWorksheet("Hướng dẫn");
  sheet.addRow([title]);
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.addRow([]);
  sheet.addRow(["Cột", "Bắt buộc?", "Định dạng / quy cách", "Ví dụ"]);
  sheet.getRow(3).font = { bold: true };
  for (const row of rows) {
    sheet.addRow([row.column, row.required, row.format, row.example]);
  }
  sheet.addRow([]);
  sheet.addRow([note]);
  sheet.getCell(`A${sheet.rowCount}`).font = { italic: true };
  sheet.getCell(`A${sheet.rowCount}`).alignment = { wrapText: true };
  sheet.columns = [{ width: 26 }, { width: 12 }, { width: 55 }, { width: 24 }];
}

/** Tải file mẫu: sheet "Hướng dẫn" giải thích từng cột, cộng vài dòng ví dụ hợp lệ ở sheet dữ liệu. */
export async function exportContactImportTemplate(): Promise<ActionResult<{ base64: string; filename: string }>> {
  const workbook = new ExcelJS.Workbook();

  writeGuideSheet(
    workbook,
    "Hướng dẫn nhập đối tác từ Excel",
    [
      { column: "Tên", required: "Bắt buộc", format: "Tên khách hàng/nhà cung cấp, tối đa 200 ký tự. Tên đã có sẽ CẬP NHẬT đối tác đó, tên chưa có sẽ THÊM MỚI.", example: "Chị Lan" },
      { column: "Điện thoại", required: "Không", format: "Tự do.", example: "0901234567" },
      { column: "Email", required: "Không", format: "Tự do.", example: "" },
      { column: "Địa chỉ", required: "Không", format: "Tự do.", example: "" },
      { column: "Mã số thuế", required: "Không", format: "Tự do.", example: "" },
      { column: "Tên ngân hàng", required: "Không", format: "Tự do.", example: "" },
      { column: "Số tài khoản", required: "Không", format: "Tự do.", example: "" },
      { column: "Khách hàng (Có/Không)", required: "Bắt buộc ít nhất 1 trong 2 cột", format: "Nhập \"Có\" hoặc \"Không\".", example: "Có" },
      { column: "Nhà cung cấp (Có/Không)", required: "Bắt buộc ít nhất 1 trong 2 cột", format: "Nhập \"Có\" hoặc \"Không\". Phải chọn Khách hàng hoặc Nhà cung cấp (có thể chọn cả hai).", example: "Không" },
      { column: "Ghi chú", required: "Không", format: "Tự do.", example: "" },
    ],
    "Lưu ý: nếu BẤT KỲ dòng nào trong file bị lỗi, toàn bộ file sẽ KHÔNG được ghi vào hệ thống — hãy sửa hết lỗi rồi nhập lại. Màn hình nhập sẽ báo lỗi theo từng dòng trước khi bạn xác nhận.",
  );

  const dataSheet = workbook.addWorksheet(CONTACT_IMPORT_SHEET_NAME);
  dataSheet.addRow(CONTACT_IMPORT_HEADERS as unknown as string[]);
  dataSheet.getRow(1).font = { bold: true };
  const sampleRows: string[][] = [
    ["Chị Lan", "0901234567", "", "", "", "", "", "Có", "Không", "Dòng ví dụ — có thể sửa hoặc xóa"],
    ["Vựa rau ABC", "", "", "", "", "", "", "Không", "Có", "Dòng ví dụ — có thể sửa hoặc xóa"],
  ];
  for (const row of sampleRows) {
    const addedRow = dataSheet.addRow(row);
    addedRow.font = { italic: true, color: { argb: "FF888888" } };
  }
  dataSheet.columns.forEach((col) => {
    col.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    ok: true,
    data: { base64: Buffer.from(buffer).toString("base64"), filename: "mau-nhap-doi-tac.xlsx" },
  };
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text ?? "");
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result ?? "");
  return String(value);
}

export async function parseContactImportFile(file: File): Promise<ActionResult<ContactImportSummary>> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return { ok: false, error: "File không đúng định dạng Excel (.xlsx)" };
  }

  const sheet = workbook.getWorksheet(CONTACT_IMPORT_SHEET_NAME) ?? workbook.worksheets[0];
  if (!sheet) return { ok: false, error: "File không có dữ liệu" };

  const rawRows: RawContactImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values as ExcelJS.CellValue[];
    const get = (col: number) => cellToString(values[col]).trim();
    if (!get(1)) return;

    rawRows.push({
      rowNumber,
      name: get(1),
      phone: get(2) || null,
      email: get(3) || null,
      address: get(4) || null,
      taxCode: get(5) || null,
      bankName: get(6) || null,
      bankAccount: get(7) || null,
      isCustomer: get(8) || null,
      isSupplier: get(9) || null,
      note: get(10) || null,
    });
  });

  if (rawRows.length === 0) {
    return { ok: false, error: "File không có dòng dữ liệu nào" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from("contacts").select("id, name");
  const existingContactIdByName = new Map((existing ?? []).map((c) => [c.name.trim().toLowerCase(), c.id]));

  return { ok: true, data: validateContactImportRows(rawRows, existingContactIdByName) };
}

export async function commitContactImport(
  rows: ValidatedContactImportRow[],
): Promise<ActionResult<{ inserted: number; updated: number }>> {
  if (rows.length === 0) return { ok: true, data: { inserted: 0, updated: 0 } };

  const supabase = await createSupabaseServerClient();
  const toInsert = rows.filter((r) => !r.existingContactId);
  const toUpdate = rows.filter((r) => r.existingContactId);

  if (toInsert.length > 0) {
    const { error } = await supabase.from("contacts").insert(
      toInsert.map((r) => ({
        name: r.name,
        phone: r.phone,
        email: r.email,
        address: r.address,
        tax_code: r.taxCode,
        bank_name: r.bankName,
        bank_account: r.bankAccount,
        is_customer: r.isCustomer,
        is_supplier: r.isSupplier,
        note: r.note,
      })),
    );
    if (error) return { ok: false, error: `Lỗi khi thêm đối tác mới: ${error.message}` };
  }

  for (const r of toUpdate) {
    const { error } = await supabase
      .from("contacts")
      .update({
        phone: r.phone,
        email: r.email,
        address: r.address,
        tax_code: r.taxCode,
        bank_name: r.bankName,
        bank_account: r.bankAccount,
        is_customer: r.isCustomer,
        is_supplier: r.isSupplier,
        note: r.note,
      })
      .eq("id", r.existingContactId as string);
    if (error) return { ok: false, error: `Lỗi khi cập nhật đối tác '${r.name}': ${error.message}` };
  }

  return { ok: true, data: { inserted: toInsert.length, updated: toUpdate.length } };
}
