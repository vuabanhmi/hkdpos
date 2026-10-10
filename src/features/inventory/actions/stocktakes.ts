"use server";

import ExcelJS from "exceljs";
import { createSupabaseServerClient } from "@/lib/db/server";
import { formatDateVN } from "@/lib/date";
import type { ActionResult } from "@/features/contacts/actions/contacts";

export type StocktakeStatus = "draft" | "counting" | "approved" | "cancelled";

export const STOCKTAKE_STATUS_LABELS: Record<StocktakeStatus, string> = {
  draft: "Nháp",
  counting: "Đang kiểm",
  approved: "Đã duyệt",
  cancelled: "Đã hủy",
};

export interface StocktakeListRow {
  id: string;
  stocktakeNo: string;
  warehouseName: string;
  stocktakeDate: string;
  status: StocktakeStatus;
  note: string | null;
}

export async function listStocktakes(): Promise<StocktakeListRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("stocktakes")
    .select("id, stocktake_no, stocktake_date, status, note, warehouses(name)")
    .order("created_at", { ascending: false });

  return (
    (data ?? []) as unknown as {
      id: string;
      stocktake_no: string;
      stocktake_date: string;
      status: StocktakeStatus;
      note: string | null;
      warehouses: { name: string } | null;
    }[]
  ).map((r) => ({
    id: r.id,
    stocktakeNo: r.stocktake_no,
    warehouseName: r.warehouses?.name ?? "",
    stocktakeDate: r.stocktake_date,
    status: r.status,
    note: r.note,
  }));
}

export interface StocktakeLineDetail {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  unitName: string;
  systemQty: number;
  countedQty: number | null;
  diffQty: number;
  unitCost: number;
  diffValue: number;
  reason: string | null;
}

export interface StocktakeDetail {
  id: string;
  stocktakeNo: string;
  warehouseId: string;
  warehouseName: string;
  stocktakeDate: string;
  status: StocktakeStatus;
  note: string | null;
  lines: StocktakeLineDetail[];
}

export async function getStocktakeDetail(id: string): Promise<StocktakeDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: stocktake, error } = await supabase
    .from("stocktakes")
    .select("id, stocktake_no, warehouse_id, stocktake_date, status, note, warehouses(name)")
    .eq("id", id)
    .maybeSingle();

  if (error || !stocktake) return null;

  const { data: lines } = await supabase
    .from("stocktake_lines")
    .select("id, product_id, system_qty, counted_qty, diff_qty, unit_cost, diff_value, reason, products(code, name, units(name))")
    .eq("stocktake_id", id);

  const stocktakeRow = stocktake as unknown as {
    id: string;
    stocktake_no: string;
    warehouse_id: string;
    stocktake_date: string;
    status: StocktakeStatus;
    note: string | null;
    warehouses: { name: string } | null;
  };

  const lineRows = (
    (lines ?? []) as unknown as {
      id: string;
      product_id: string;
      system_qty: number;
      counted_qty: number | null;
      diff_qty: number;
      unit_cost: number;
      diff_value: number;
      reason: string | null;
      products: { code: string; name: string; units: { name: string } | null } | null;
    }[]
  ).map((l) => ({
    id: l.id,
    productId: l.product_id,
    productCode: l.products?.code ?? "",
    productName: l.products?.name ?? "",
    unitName: l.products?.units?.name ?? "",
    systemQty: l.system_qty,
    countedQty: l.counted_qty,
    diffQty: l.diff_qty,
    unitCost: l.unit_cost,
    diffValue: l.diff_value,
    reason: l.reason,
  }));

  lineRows.sort((a, b) => a.productName.localeCompare(b.productName));

  return {
    id: stocktakeRow.id,
    stocktakeNo: stocktakeRow.stocktake_no,
    warehouseId: stocktakeRow.warehouse_id,
    warehouseName: stocktakeRow.warehouses?.name ?? "",
    stocktakeDate: stocktakeRow.stocktake_date,
    status: stocktakeRow.status,
    note: stocktakeRow.note,
    lines: lineRows,
  };
}

export interface StocktakeProductOption {
  id: string;
  code: string;
  name: string;
  groupId: string | null;
}

/** Danh sách sản phẩm có theo dõi tồn, kèm nhóm — dùng cho dialog tạo phiên kiểm kho (chọn theo nhóm). */
export async function listStocktakeProductOptions(): Promise<StocktakeProductOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("id, code, name, group_id")
    .eq("is_active", true)
    .eq("track_stock", true)
    .order("name");

  return (data ?? []).map((p) => ({ id: p.id, code: p.code, name: p.name, groupId: p.group_id }));
}

export async function createStocktake(input: {
  warehouseId: string;
  stocktakeDate: string;
  productIds: string[] | null;
  note?: string | null;
}): Promise<ActionResult<{ id: string; stocktakeNo: string }>> {
  if (!input.warehouseId) return { ok: false, error: "Thiếu kho" };
  if (!input.stocktakeDate) return { ok: false, error: "Thiếu ngày kiểm kho" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_stocktake", {
    p_warehouse_id: input.warehouseId,
    p_stocktake_date: input.stocktakeDate,
    p_product_ids: input.productIds ?? undefined,
    p_note: input.note ?? undefined,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data.id, stocktakeNo: data.stocktake_no } };
}

export async function setStocktakeLineCount(
  lineId: string,
  countedQty: number | null,
  reason?: string | null,
): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("stocktake_lines")
    .update({ counted_qty: countedQty, reason: reason?.trim() ? reason.trim() : null })
    .eq("id", lineId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function approveStocktake(id: string): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("approve_stocktake", { p_stocktake_id: id });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function exportStocktakeToExcel(id: string): Promise<ActionResult<{ base64: string; filename: string }>> {
  const detail = await getStocktakeDetail(id);
  if (!detail) return { ok: false, error: "Không tìm thấy phiên kiểm kho" };

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Kiểm kho");
  sheet.addRow([`Phiên kiểm kho ${detail.stocktakeNo} — Kho ${detail.warehouseName} — Ngày ${formatDateVN(new Date(detail.stocktakeDate))}`]);
  sheet.addRow([]);
  sheet.addRow(["Mã SP", "Tên sản phẩm", "Đơn vị", "Tồn sổ sách", "Đếm thực tế", "Chênh lệch (SL)", "Giá vốn", "Chênh lệch (giá trị)", "Lý do"]);
  sheet.getRow(3).font = { bold: true };

  for (const l of detail.lines) {
    sheet.addRow([
      l.productCode, l.productName, l.unitName,
      l.systemQty, l.countedQty, l.diffQty, l.unitCost, l.diffValue, l.reason ?? "",
    ]);
  }

  sheet.columns.forEach((col) => {
    col.width = 16;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    ok: true,
    data: { base64: Buffer.from(buffer).toString("base64"), filename: `kiem-kho-${detail.stocktakeNo}.xlsx` },
  };
}
