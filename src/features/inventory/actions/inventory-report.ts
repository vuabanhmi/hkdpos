"use server";

import ExcelJS from "exceljs";
import { createSupabaseServerClient } from "@/lib/db/server";
import { formatDateVN } from "@/lib/date";
import type { ActionResult } from "@/features/contacts/actions/contacts";

export interface InventoryFlowRow {
  productId: string;
  productCode: string;
  productName: string;
  unitName: string;
  beginQty: number;
  inQty: number;
  outQty: number;
  endQty: number;
  beginValue: number;
  inValue: number;
  outValue: number;
  endValue: number;
}

export interface InventoryFlowFilters {
  dateFrom: string;
  dateTo: string;
  warehouseId?: string | "all";
  groupId?: string | "all";
}

async function fetchInventoryFlowRows(filters: InventoryFlowFilters): Promise<InventoryFlowRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("inventory_flow_report", {
    p_date_from: filters.dateFrom,
    p_date_to: filters.dateTo,
    p_warehouse_id: filters.warehouseId && filters.warehouseId !== "all" ? filters.warehouseId : undefined,
    p_group_id: filters.groupId && filters.groupId !== "all" ? filters.groupId : undefined,
  });

  if (error) throw new Error(error.message);

  return (
    (data ?? []) as unknown as {
      product_id: string;
      product_code: string;
      product_name: string;
      unit_name: string;
      begin_qty: number;
      in_qty: number;
      out_qty: number;
      end_qty: number;
      begin_value: number;
      in_value: number;
      out_value: number;
      end_value: number;
    }[]
  )
    .map((r) => ({
      productId: r.product_id,
      productCode: r.product_code,
      productName: r.product_name,
      unitName: r.unit_name,
      beginQty: r.begin_qty,
      inQty: r.in_qty,
      outQty: r.out_qty,
      endQty: r.end_qty,
      beginValue: r.begin_value,
      inValue: r.in_value,
      outValue: r.out_value,
      endValue: r.end_value,
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName));
}

export async function getInventoryFlowReport(filters: InventoryFlowFilters): Promise<InventoryFlowRow[]> {
  return fetchInventoryFlowRows(filters);
}

export async function exportInventoryFlowReportToExcel(
  filters: InventoryFlowFilters,
): Promise<ActionResult<{ base64: string; filename: string }>> {
  const rows = await fetchInventoryFlowRows(filters);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Xuất nhập tồn");
  sheet.addRow([`Báo cáo xuất nhập tồn: ${formatDateVN(new Date(filters.dateFrom))} — ${formatDateVN(new Date(filters.dateTo))}`]);
  sheet.addRow([]);
  sheet.addRow([
    "Mã SP", "Tên sản phẩm", "Đơn vị",
    "Tồn đầu (SL)", "Nhập (SL)", "Xuất (SL)", "Tồn cuối (SL)",
    "Tồn đầu (giá trị)", "Nhập (giá trị)", "Xuất (giá trị)", "Tồn cuối (giá trị)",
  ]);
  sheet.getRow(3).font = { bold: true };

  for (const r of rows) {
    sheet.addRow([
      r.productCode, r.productName, r.unitName,
      r.beginQty, r.inQty, r.outQty, r.endQty,
      r.beginValue, r.inValue, r.outValue, r.endValue,
    ]);
  }

  sheet.columns.forEach((col) => {
    col.width = 16;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    ok: true,
    data: {
      base64: Buffer.from(buffer).toString("base64"),
      filename: `xuat-nhap-ton-${filters.dateFrom}-den-${filters.dateTo}.xlsx`,
    },
  };
}
