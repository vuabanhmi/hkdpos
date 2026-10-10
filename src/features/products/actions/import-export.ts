"use server";

import ExcelJS from "exceljs";
import { createSupabaseServerClient } from "@/lib/db/server";
import {
  type ProductImportSummary,
  type RawProductImportRow,
  type ValidatedProductImportRow,
  validateProductImportRows,
} from "@/features/products/domain/import";
import type { ActionResult } from "./reference-data";

// Không export: file "use server" chỉ được export async function, export hằng số
// (dù chỉ dùng nội bộ file này) sẽ làm Next.js coi cả module là không có export hợp lệ.
const PRODUCT_IMPORT_SHEET_NAME = "Sản phẩm";

const PRODUCT_IMPORT_HEADERS = [
  "Mã",
  "Tên",
  "Mã vạch",
  "Đơn vị",
  "Nhóm sản phẩm",
  "Nhóm ngành nghề tính thuế",
  "Theo dõi kho (Có/Không)",
  "Giá vốn",
  "Ghi chú",
] as const;

export async function exportProductsToExcel(): Promise<ActionResult<{ base64: string; filename: string }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "code, name, barcode, track_stock, cost_price, note, units(name), product_groups(name), tax_categories(name)",
    )
    .order("code");

  if (error) return { ok: false, error: error.message };

  const rows = (data ?? []) as unknown as {
    code: string;
    name: string;
    barcode: string | null;
    track_stock: boolean;
    cost_price: number;
    note: string | null;
    units: { name: string } | null;
    product_groups: { name: string } | null;
    tax_categories: { name: string } | null;
  }[];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(PRODUCT_IMPORT_SHEET_NAME);
  sheet.addRow(PRODUCT_IMPORT_HEADERS as unknown as string[]);
  for (const row of rows) {
    sheet.addRow([
      row.code,
      row.name,
      row.barcode ?? "",
      row.units?.name ?? "",
      row.product_groups?.name ?? "",
      row.tax_categories?.name ?? "",
      row.track_stock ? "Có" : "Không",
      row.cost_price,
      row.note ?? "",
    ]);
  }
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    col.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  return {
    ok: true,
    data: { base64, filename: `san-pham-${new Date().toISOString().slice(0, 10)}.xlsx` },
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

/** Tải file mẫu: sheet "Hướng dẫn" giải thích từng cột theo đúng danh mục đang có, cộng vài dòng ví dụ hợp lệ ở sheet dữ liệu. */
export async function exportProductImportTemplate(): Promise<ActionResult<{ base64: string; filename: string }>> {
  const supabase = await createSupabaseServerClient();
  const [{ data: units }, { data: groups }, { data: taxCategories }] = await Promise.all([
    supabase.from("units").select("name").order("name"),
    supabase.from("product_groups").select("name").eq("is_active", true).order("name"),
    supabase.from("tax_categories").select("name").eq("is_active", true).order("name"),
  ]);

  const unitNames = (units ?? []).map((u) => u.name);
  const groupNames = (groups ?? []).map((g) => g.name);
  const taxCategoryNames = (taxCategories ?? []).map((t) => t.name);
  const sampleUnit = unitNames[0] ?? "Cái";

  const workbook = new ExcelJS.Workbook();

  writeGuideSheet(
    workbook,
    "Hướng dẫn nhập sản phẩm từ Excel",
    [
      { column: "Mã", required: "Bắt buộc", format: "Chữ, số, '.', '_', '-', không khoảng trắng, tối đa 32 ký tự. Mã đã có sẽ CẬP NHẬT sản phẩm đó, mã chưa có sẽ THÊM MỚI.", example: "SP001" },
      { column: "Tên", required: "Bắt buộc", format: "Tên sản phẩm, tối đa 200 ký tự.", example: "Cà phê đen" },
      { column: "Mã vạch", required: "Không", format: "Để trống nếu không có. Không được trùng mã vạch sản phẩm khác.", example: "8938505970018" },
      {
        column: "Đơn vị",
        required: "Bắt buộc",
        format: `Phải khớp đúng tên một đơn vị đã có trong hệ thống (không phân biệt hoa/thường).${unitNames.length ? ` Đang có: ${unitNames.join(", ")}.` : ""}`,
        example: sampleUnit,
      },
      {
        column: "Nhóm sản phẩm",
        required: "Không",
        format: groupNames.length
          ? `Để trống nếu chưa phân nhóm. Phải khớp đúng tên một nhóm đã có. Đang có: ${groupNames.join(", ")}.`
          : "Để trống nếu chưa phân nhóm. Hệ thống chưa có nhóm sản phẩm nào — tạo nhóm trong /products trước khi dùng cột này.",
        example: groupNames[0] ?? "",
      },
      {
        column: "Nhóm ngành nghề tính thuế",
        required: "Không (nhưng nên có để tính thuế đúng)",
        format: taxCategoryNames.length
          ? `Phải khớp đúng tên một nhóm đã có. Đang có: ${taxCategoryNames.join(", ")}.`
          : "Hệ thống chưa có nhóm ngành nghề tính thuế nào — tạo trong /products trước khi dùng cột này.",
        example: taxCategoryNames[0] ?? "",
      },
      { column: "Theo dõi kho (Có/Không)", required: "Không", format: "Nhập \"Có\" hoặc \"Không\". Để trống sẽ hiểu là \"Có\".", example: "Có" },
      { column: "Giá vốn", required: "Không", format: "Số tiền nguyên đồng, có thể dùng dấu chấm ngăn nghìn. Để trống sẽ hiểu là 0.", example: "15.000" },
      { column: "Ghi chú", required: "Không", format: "Tự do.", example: "" },
    ],
    "Lưu ý: nếu BẤT KỲ dòng nào trong file bị lỗi, toàn bộ file sẽ KHÔNG được ghi vào hệ thống — hãy sửa hết lỗi rồi nhập lại. Màn hình nhập sẽ báo lỗi theo từng dòng trước khi bạn xác nhận.",
  );

  const dataSheet = workbook.addWorksheet(PRODUCT_IMPORT_SHEET_NAME);
  dataSheet.addRow(PRODUCT_IMPORT_HEADERS as unknown as string[]);
  dataSheet.getRow(1).font = { bold: true };
  const sampleRows: (string | number)[][] = [
    ["SP001", "Cà phê đen", "", sampleUnit, groupNames[0] ?? "", taxCategoryNames[0] ?? "", "Có", 15000, "Dòng ví dụ — có thể sửa hoặc xóa"],
    ["SP002", "Trà đào", "8938505970018", sampleUnit, groupNames[0] ?? "", taxCategoryNames[0] ?? "", "Có", 20000, "Dòng ví dụ — có thể sửa hoặc xóa"],
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
    data: { base64: Buffer.from(buffer).toString("base64"), filename: "mau-nhap-san-pham.xlsx" },
  };
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text ?? "");
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result ?? "");
  return String(value);
}

export async function parseProductImportFile(file: File): Promise<ActionResult<ProductImportSummary>> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return { ok: false, error: "File không đúng định dạng Excel (.xlsx)" };
  }

  const sheet = workbook.getWorksheet(PRODUCT_IMPORT_SHEET_NAME) ?? workbook.worksheets[0];
  if (!sheet) return { ok: false, error: "File không có dữ liệu" };

  const rawRows: RawProductImportRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // dòng tiêu đề
    const values = row.values as ExcelJS.CellValue[]; // index 0 bỏ trống, cột bắt đầu từ 1
    const get = (col: number) => cellToString(values[col]).trim();
    const isEmpty = !get(1) && !get(2);
    if (isEmpty) return;

    rawRows.push({
      rowNumber,
      code: get(1),
      name: get(2),
      barcode: get(3) || null,
      unitName: get(4),
      groupName: get(5) || null,
      taxCategoryName: get(6) || null,
      trackStock: get(7) || null,
      costPrice: get(8) || null,
      note: get(9) || null,
    });
  });

  if (rawRows.length === 0) {
    return { ok: false, error: "File không có dòng dữ liệu nào" };
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: units }, { data: groups }, { data: taxCategories }, { data: existing }] = await Promise.all([
    supabase.from("units").select("id, name"),
    supabase.from("product_groups").select("id, name").eq("is_active", true),
    supabase.from("tax_categories").select("id, name").eq("is_active", true),
    supabase.from("products").select("id, code"),
  ]);

  const normalize = (s: string) => s.trim().toLowerCase();

  const summary = validateProductImportRows(rawRows, {
    unitIdByName: new Map((units ?? []).map((u) => [normalize(u.name), u.id])),
    groupIdByName: new Map((groups ?? []).map((g) => [normalize(g.name), g.id])),
    taxCategoryIdByName: new Map((taxCategories ?? []).map((t) => [normalize(t.name), t.id])),
    existingProductIdByCode: new Map((existing ?? []).map((p) => [normalize(p.code), p.id])),
  });

  return { ok: true, data: summary };
}

export async function commitProductImport(
  rows: ValidatedProductImportRow[],
): Promise<ActionResult<{ inserted: number; updated: number }>> {
  if (rows.length === 0) return { ok: true, data: { inserted: 0, updated: 0 } };

  const supabase = await createSupabaseServerClient();
  const toInsert = rows.filter((r) => !r.existingProductId);
  const toUpdate = rows.filter((r) => r.existingProductId);

  if (toInsert.length > 0) {
    const { error } = await supabase.from("products").insert(
      toInsert.map((r) => ({
        code: r.code,
        name: r.name,
        barcode: r.barcode,
        unit_id: r.unitId,
        group_id: r.groupId,
        tax_category_id: r.taxCategoryId,
        track_stock: r.trackStock,
        cost_price: r.costPrice,
        note: r.note,
      })),
    );
    if (error) return { ok: false, error: `Lỗi khi thêm sản phẩm mới: ${error.message}` };
  }

  for (const r of toUpdate) {
    const { error } = await supabase
      .from("products")
      .update({
        name: r.name,
        barcode: r.barcode,
        unit_id: r.unitId,
        group_id: r.groupId,
        tax_category_id: r.taxCategoryId,
        track_stock: r.trackStock,
        cost_price: r.costPrice,
        note: r.note,
      })
      .eq("id", r.existingProductId as string);
    if (error) return { ok: false, error: `Lỗi khi cập nhật sản phẩm '${r.code}': ${error.message}` };
  }

  return { ok: true, data: { inserted: toInsert.length, updated: toUpdate.length } };
}
