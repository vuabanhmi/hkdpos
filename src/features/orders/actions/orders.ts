"use server";

import ExcelJS from "exceljs";
import { createSupabaseServerClient } from "@/lib/db/server";
import { formatDateTimeVN } from "@/lib/date";
import type { ActionResult } from "@/features/contacts/actions/contacts";
import type { PaymentInput } from "@/features/sales/actions/pos";

export type OrderStatus = "draft" | "completed" | "cancelled";

export interface OrderListFilters {
  status?: OrderStatus | "all";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

export interface OrderListRow {
  id: string;
  orderNo: string;
  contactName: string | null;
  status: OrderStatus;
  orderedAt: string;
  total: number;
  debtTotal: number;
  hasReturn: boolean;
}

type OrderQueryRow = {
  id: string;
  order_no: string;
  status: OrderStatus;
  ordered_at: string;
  total: number;
  debt_total: number;
  contacts: { name: string } | null;
};

export async function listOrders(filters: OrderListFilters): Promise<{ rows: OrderListRow[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const page = Math.max(1, filters.page);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select("id, order_no, status, ordered_at, total, debt_total, contacts(name)", { count: "exact" })
    .neq("status", "draft");

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.dateFrom) query = query.gte("ordered_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("ordered_at", filters.dateTo);

  const term = filters.search?.trim();
  if (term) {
    query = query.ilike("order_no", `*${term.replace(/[,*]/g, "")}*`);
  }

  const { data, count, error } = await query.order("ordered_at", { ascending: false }).range(from, to);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as OrderQueryRow[];
  const orderIds = rows.map((r) => r.id);
  const returnedOrderIds = new Set<string>();
  if (orderIds.length > 0) {
    const { data: returns } = await supabase.from("order_returns").select("order_id").in("order_id", orderIds);
    for (const r of returns ?? []) returnedOrderIds.add(r.order_id);
  }

  return {
    rows: rows.map((r) => ({
      id: r.id,
      orderNo: r.order_no,
      contactName: r.contacts?.name ?? null,
      status: r.status,
      orderedAt: r.ordered_at,
      total: r.total,
      debtTotal: r.debt_total,
      hasReturn: returnedOrderIds.has(r.id),
    })),
    total: count ?? 0,
  };
}

export interface OrderItemDetail {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
  unitCostSnapshot: number | null;
  returnedQuantity: number;
}

export interface PaymentDetail {
  id: string;
  method: "cash" | "transfer" | "other";
  amount: number;
  paidAt: string;
  note: string | null;
}

export interface ReturnDetail {
  id: string;
  returnNo: string;
  occurredAt: string;
  reason: string;
  totalAmount: number;
}

export interface OrderDetail {
  id: string;
  orderNo: string;
  contactId: string | null;
  contactName: string | null;
  status: OrderStatus;
  orderedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  note: string | null;
  subtotal: number;
  discountTotal: number;
  total: number;
  paidTotal: number;
  debtTotal: number;
  items: OrderItemDetail[];
  payments: PaymentDetail[];
  returns: ReturnDetail[];
}

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, order_no, contact_id, status, ordered_at, completed_at, cancelled_at, cancel_reason, note, subtotal, discount_total, total, paid_total, debt_total, contacts(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !order) return null;

  const o = order as unknown as {
    id: string;
    order_no: string;
    contact_id: string | null;
    status: OrderStatus;
    ordered_at: string;
    completed_at: string | null;
    cancelled_at: string | null;
    cancel_reason: string | null;
    note: string | null;
    subtotal: number;
    discount_total: number;
    total: number;
    paid_total: number;
    debt_total: number;
    contacts: { name: string } | null;
  };

  const [{ data: items }, { data: payments }, { data: returns }, { data: returnItems }] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, product_id, product_code_snapshot, product_name_snapshot, unit_name_snapshot, quantity, unit_price, discount, line_total, unit_cost_snapshot")
      .eq("order_id", id),
    supabase.from("payments").select("id, method, amount, paid_at, note").eq("order_id", id).order("paid_at"),
    supabase
      .from("order_returns")
      .select("id, return_no, occurred_at, reason, total_amount")
      .eq("order_id", id)
      .order("occurred_at"),
    supabase
      .from("order_return_items")
      .select("order_item_id, quantity, order_returns!inner(order_id)")
      .eq("order_returns.order_id", id),
  ]);

  const returnedQtyByItemId = new Map<string, number>();
  for (const ri of (returnItems ?? []) as unknown as { order_item_id: string; quantity: number }[]) {
    returnedQtyByItemId.set(ri.order_item_id, (returnedQtyByItemId.get(ri.order_item_id) ?? 0) + ri.quantity);
  }

  return {
    id: o.id,
    orderNo: o.order_no,
    contactId: o.contact_id,
    contactName: o.contacts?.name ?? null,
    status: o.status,
    orderedAt: o.ordered_at,
    completedAt: o.completed_at,
    cancelledAt: o.cancelled_at,
    cancelReason: o.cancel_reason,
    note: o.note,
    subtotal: o.subtotal,
    discountTotal: o.discount_total,
    total: o.total,
    paidTotal: o.paid_total,
    debtTotal: o.debt_total,
    items: (
      (items ?? []) as unknown as {
        id: string;
        product_id: string;
        product_code_snapshot: string;
        product_name_snapshot: string;
        unit_name_snapshot: string;
        quantity: number;
        unit_price: number;
        discount: number;
        line_total: number;
        unit_cost_snapshot: number | null;
      }[]
    ).map((i) => ({
      id: i.id,
      productId: i.product_id,
      productCode: i.product_code_snapshot,
      productName: i.product_name_snapshot,
      unitName: i.unit_name_snapshot,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      discount: i.discount,
      lineTotal: i.line_total,
      unitCostSnapshot: i.unit_cost_snapshot,
      returnedQuantity: returnedQtyByItemId.get(i.id) ?? 0,
    })),
    payments: ((payments ?? []) as unknown as { id: string; method: "cash" | "transfer" | "other"; amount: number; paid_at: string; note: string | null }[]).map((p) => ({
      id: p.id,
      method: p.method,
      amount: p.amount,
      paidAt: p.paid_at,
      note: p.note,
    })),
    returns: ((returns ?? []) as unknown as { id: string; return_no: string; occurred_at: string; reason: string; total_amount: number }[]).map((r) => ({
      id: r.id,
      returnNo: r.return_no,
      occurredAt: r.occurred_at,
      reason: r.reason,
      totalAmount: r.total_amount,
    })),
  };
}

export async function cancelOrder(orderId: string, reason: string): Promise<ActionResult<null>> {
  if (!reason.trim()) return { ok: false, error: "Phải nhập lý do hủy đơn" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_order", { p_order_id: orderId, p_reason: reason.trim() });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function createOrderReturn(
  orderId: string,
  lines: { orderItemId: string; quantity: number }[],
  reason: string,
): Promise<ActionResult<{ returnNo: string; totalAmount: number }>> {
  if (!reason.trim()) return { ok: false, error: "Phải nhập lý do trả hàng" };
  if (lines.length === 0) return { ok: false, error: "Phải chọn ít nhất một dòng hàng để trả" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_return", {
    p_order_id: orderId,
    p_lines: lines.map((l) => ({ order_item_id: l.orderItemId, quantity: l.quantity })),
    p_reason: reason.trim(),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { returnNo: data.return_no, totalAmount: data.total_amount } };
}

export async function recordOrderPayment(
  orderId: string,
  payment: PaymentInput,
): Promise<ActionResult<{ debtTotal: number }>> {
  if (payment.amount <= 0) return { ok: false, error: "Số tiền thanh toán phải lớn hơn 0" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("record_order_payment", {
    p_order_id: orderId,
    p_method: payment.method,
    p_amount: payment.amount,
    p_note: payment.note ?? undefined,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { debtTotal: data.debt_total } };
}

const ORDER_EXPORT_HEADERS = [
  "Mã đơn",
  "Thời điểm",
  "Khách hàng",
  "Trạng thái",
  "Tạm tính",
  "Giảm giá",
  "Tổng cộng",
  "Đã thanh toán",
  "Còn nợ",
] as const;

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Nháp",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export async function exportOrdersToExcel(
  filters: Omit<OrderListFilters, "page" | "pageSize">,
): Promise<ActionResult<{ base64: string; filename: string }>> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("orders")
    .select("order_no, ordered_at, status, subtotal, discount_total, total, paid_total, debt_total, contacts(name)")
    .neq("status", "draft");

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.dateFrom) query = query.gte("ordered_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("ordered_at", filters.dateTo);
  const term = filters.search?.trim();
  if (term) query = query.ilike("order_no", `*${term.replace(/[,*]/g, "")}*`);

  const { data, error } = await query.order("ordered_at", { ascending: false });
  if (error) return { ok: false, error: error.message };

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Đơn hàng");
  sheet.addRow(ORDER_EXPORT_HEADERS as unknown as string[]);
  for (const row of (data ?? []) as unknown as {
    order_no: string;
    ordered_at: string;
    status: OrderStatus;
    subtotal: number;
    discount_total: number;
    total: number;
    paid_total: number;
    debt_total: number;
    contacts: { name: string } | null;
  }[]) {
    sheet.addRow([
      row.order_no,
      formatDateTimeVN(new Date(row.ordered_at)),
      row.contacts?.name ?? "Khách lẻ",
      ORDER_STATUS_LABELS[row.status],
      row.subtotal,
      row.discount_total,
      row.total,
      row.paid_total,
      row.debt_total,
    ]);
  }
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    col.width = 18;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    ok: true,
    data: {
      base64: Buffer.from(buffer).toString("base64"),
      filename: `don-hang-${new Date().toISOString().slice(0, 10)}.xlsx`,
    },
  };
}
