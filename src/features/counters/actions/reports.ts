"use server";

import ExcelJS from "exceljs";
import { createSupabaseServerClient } from "@/lib/db/server";
import { endOfDayVN, formatDateVN, startOfDayVN } from "@/lib/date";
import type { ActionResult } from "@/features/contacts/actions/contacts";

export interface CounterReportRow {
  reportDate: string;
  counterId: string | null;
  counterName: string;
  orderCount: number;
  totalQuantity: number;
  grossAmount: number;
  discountAmount: number;
  returnAmount: number;
  netAmount: number;
}

export interface CounterReportResult {
  rows: CounterReportRow[];
  totals: Omit<CounterReportRow, "reportDate" | "counterId" | "counterName">;
}

function sumReport(rows: CounterReportRow[]): CounterReportResult["totals"] {
  return rows.reduce(
    (acc, r) => ({
      orderCount: acc.orderCount + r.orderCount,
      totalQuantity: acc.totalQuantity + r.totalQuantity,
      grossAmount: acc.grossAmount + r.grossAmount,
      discountAmount: acc.discountAmount + r.discountAmount,
      returnAmount: acc.returnAmount + r.returnAmount,
      netAmount: acc.netAmount + r.netAmount,
    }),
    { orderCount: 0, totalQuantity: 0, grossAmount: 0, discountAmount: 0, returnAmount: 0, netAmount: 0 },
  );
}

/** Gộp theo quầy (cộng tất cả các ngày trong khoảng) để hiển thị bảng chính — báo cáo theo ngày dùng cho đối chiếu. */
export async function getCounterReport(dateFrom: string, dateTo: string): Promise<CounterReportResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("counter_daily_report", {
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });

  if (error) throw new Error(error.message);

  const byCounter = new Map<string, CounterReportRow>();
  for (const row of (data ?? []) as unknown as {
    report_date: string;
    counter_id: string | null;
    counter_name: string;
    order_count: number;
    total_quantity: number;
    gross_amount: number;
    discount_amount: number;
    return_amount: number;
    net_amount: number;
  }[]) {
    const key = row.counter_id ?? "unassigned";
    const existing = byCounter.get(key);
    if (existing) {
      existing.orderCount += row.order_count;
      existing.totalQuantity += row.total_quantity;
      existing.grossAmount += row.gross_amount;
      existing.discountAmount += row.discount_amount;
      existing.returnAmount += row.return_amount;
      existing.netAmount += row.net_amount;
    } else {
      byCounter.set(key, {
        reportDate: dateFrom,
        counterId: row.counter_id,
        counterName: row.counter_name,
        orderCount: row.order_count,
        totalQuantity: row.total_quantity,
        grossAmount: row.gross_amount,
        discountAmount: row.discount_amount,
        returnAmount: row.return_amount,
        netAmount: row.net_amount,
      });
    }
  }

  const rows = [...byCounter.values()].sort((a, b) => a.counterName.localeCompare(b.counterName));
  return { rows, totals: sumReport(rows) };
}

export interface CounterProductBreakdownRow {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  netAmount: number;
  avgUnitPrice: number;
}

export async function getCounterProductBreakdown(
  counterId: string | null,
  dateFrom: string,
  dateTo: string,
): Promise<CounterProductBreakdownRow[]> {
  const supabase = await createSupabaseServerClient();
  const rangeStart = startOfDayVN(new Date(dateFrom)).toISOString();
  const rangeEnd = endOfDayVN(new Date(dateTo)).toISOString();

  let saleQuery = supabase
    .from("order_items")
    .select("product_id, quantity, net_amount, orders!inner(status, completed_at)")
    .eq("orders.status", "completed")
    .gte("orders.completed_at", rangeStart)
    .lte("orders.completed_at", rangeEnd);
  saleQuery = counterId ? saleQuery.eq("counter_id", counterId) : saleQuery.is("counter_id", null);
  const { data: saleRows } = await saleQuery;

  let returnQuery = supabase
    .from("order_return_items")
    .select("quantity, net_amount, order_item_id, order_returns!inner(occurred_at)")
    .gte("order_returns.occurred_at", rangeStart)
    .lte("order_returns.occurred_at", rangeEnd);
  returnQuery = counterId ? returnQuery.eq("counter_id", counterId) : returnQuery.is("counter_id", null);
  const { data: returnRows } = await returnQuery;

  const returnItemIds = [...new Set((returnRows ?? []).map((r) => r.order_item_id))];
  const productIdByOrderItemId = new Map<string, string>();
  if (returnItemIds.length > 0) {
    const { data: items } = await supabase.from("order_items").select("id, product_id").in("id", returnItemIds);
    for (const i of items ?? []) productIdByOrderItemId.set(i.id, i.product_id);
  }

  const byProduct = new Map<string, { quantity: number; netAmount: number }>();

  for (const row of (saleRows ?? []) as unknown as { product_id: string; quantity: number; net_amount: number | null }[]) {
    const acc = byProduct.get(row.product_id) ?? { quantity: 0, netAmount: 0 };
    acc.quantity += row.quantity;
    acc.netAmount += row.net_amount ?? 0;
    byProduct.set(row.product_id, acc);
  }

  for (const row of (returnRows ?? []) as unknown as { quantity: number; net_amount: number | null; order_item_id: string }[]) {
    const productId = productIdByOrderItemId.get(row.order_item_id);
    if (!productId) continue;
    const acc = byProduct.get(productId) ?? { quantity: 0, netAmount: 0 };
    acc.quantity += -row.quantity; // trả hàng trừ lại số lượng đã bán
    acc.netAmount += row.net_amount ?? 0; // đã là số âm
    byProduct.set(productId, acc);
  }

  const productIds = [...byProduct.keys()];
  if (productIds.length === 0) return [];

  const { data: products } = await supabase.from("products").select("id, code, name").in("id", productIds);
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  return productIds
    .map((id) => {
      const acc = byProduct.get(id)!;
      const product = productById.get(id);
      return {
        productId: id,
        productCode: product?.code ?? "",
        productName: product?.name ?? "",
        quantity: acc.quantity,
        netAmount: acc.netAmount,
        avgUnitPrice: acc.quantity !== 0 ? Math.round(acc.netAmount / acc.quantity) : 0,
      };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName));
}

/** Tổng doanh thu cuối ngày tính độc lập từ orders (không qua counter_daily_report), dùng để đối chiếu. */
export async function getIndependentCompletedTotal(dateFrom: string, dateTo: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const rangeStart = startOfDayVN(new Date(dateFrom)).toISOString();
  const rangeEnd = endOfDayVN(new Date(dateTo)).toISOString();

  const { data } = await supabase
    .from("orders")
    .select("total")
    .eq("status", "completed")
    .gte("completed_at", rangeStart)
    .lte("completed_at", rangeEnd);

  const salesTotal = (data ?? []).reduce((sum, o) => sum + o.total, 0);

  const { data: returns } = await supabase
    .from("order_returns")
    .select("total_amount")
    .gte("occurred_at", rangeStart)
    .lte("occurred_at", rangeEnd);

  const returnsTotal = (returns ?? []).reduce((sum, r) => sum + r.total_amount, 0);

  return salesTotal - returnsTotal;
}

export async function exportCounterReportToExcel(
  dateFrom: string,
  dateTo: string,
): Promise<ActionResult<{ base64: string; filename: string }>> {
  const { rows, totals } = await getCounterReport(dateFrom, dateTo);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Theo quầy");
  sheet.addRow([`Báo cáo theo quầy: ${formatDateVN(new Date(dateFrom))} — ${formatDateVN(new Date(dateTo))}`]);
  sheet.addRow([]);
  sheet.addRow(["Quầy", "Số đơn", "Số lượng", "Doanh số gộp", "Giảm giá", "Trả hàng", "Doanh thu thực"]);
  sheet.getRow(3).font = { bold: true };

  for (const r of rows) {
    sheet.addRow([r.counterName, r.orderCount, r.totalQuantity, r.grossAmount, r.discountAmount, r.returnAmount, r.netAmount]);
  }
  const totalRow = sheet.addRow([
    "Tổng cộng",
    totals.orderCount,
    totals.totalQuantity,
    totals.grossAmount,
    totals.discountAmount,
    totals.returnAmount,
    totals.netAmount,
  ]);
  totalRow.font = { bold: true };

  sheet.columns.forEach((col) => {
    col.width = 18;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    ok: true,
    data: {
      base64: Buffer.from(buffer).toString("base64"),
      filename: `bao-cao-theo-quay-${dateFrom}-den-${dateTo}.xlsx`,
    },
  };
}
