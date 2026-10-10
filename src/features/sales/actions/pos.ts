"use server";

import { createSupabaseServerClient } from "@/lib/db/server";
import type { ActionResult } from "@/features/contacts/actions/contacts";

export interface PosProduct {
  id: string;
  code: string;
  name: string;
  barcode: string | null;
  unitName: string;
  groupId: string | null;
  price: number | null;
  trackStock: boolean;
  counterId: string | null;
  counterName: string | null;
}

export async function listPosProducts(): Promise<PosProduct[]> {
  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, code, name, barcode, group_id, counter_id, track_stock, units(name)")
    .eq("is_active", true)
    .order("name");

  const { data: defaultPriceList } = await supabase
    .from("price_lists")
    .select("id")
    .eq("is_default", true)
    .maybeSingle();

  const priceByProductId = new Map<string, number>();
  if (defaultPriceList) {
    const { data: items } = await supabase
      .from("price_list_items")
      .select("product_id, price")
      .eq("price_list_id", defaultPriceList.id);
    for (const item of items ?? []) priceByProductId.set(item.product_id, item.price);
  }

  const [{ data: assignments }, { data: counters }] = await Promise.all([
    supabase.from("counter_product_groups").select("product_group_id, counter_id"),
    supabase.from("counters").select("id, name"),
  ]);
  const counterIdByGroupId = new Map((assignments ?? []).map((a) => [a.product_group_id, a.counter_id]));
  const counterNameById = new Map((counters ?? []).map((c) => [c.id, c.name]));

  return (
    (products ?? []) as unknown as {
      id: string;
      code: string;
      name: string;
      barcode: string | null;
      group_id: string | null;
      counter_id: string | null;
      track_stock: boolean;
      units: { name: string } | null;
    }[]
  ).map((p) => {
    const resolvedCounterId = p.counter_id ?? (p.group_id ? counterIdByGroupId.get(p.group_id) ?? null : null);
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      barcode: p.barcode,
      unitName: p.units?.name ?? "",
      groupId: p.group_id,
      price: priceByProductId.get(p.id) ?? null,
      trackStock: p.track_stock,
      counterId: resolvedCounterId,
      counterName: resolvedCounterId ? counterNameById.get(resolvedCounterId) ?? null : null,
    };
  });
}

export interface OrderCartLine {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export interface DraftOrderItemSummary {
  orderItemId: string;
  productId: string;
  productName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

export interface DraftOrderSummary {
  id: string;
  orderNo: string;
  contactId: string | null;
  contactName: string | null;
  note: string | null;
  subtotal: number;
  discountTotal: number;
  total: number;
  items: DraftOrderItemSummary[];
}

export async function createDraftOrder(
  contactId?: string | null,
): Promise<ActionResult<{ id: string; orderNo: string }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_draft_order", {
    p_contact_id: contactId ?? undefined,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data.id, orderNo: data.order_no } };
}

export async function listDraftOrders(): Promise<DraftOrderSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_no, contact_id, note, subtotal, discount_total, total, contacts(name)")
    .eq("status", "draft")
    .order("created_at");

  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: items } = await supabase
    .from("order_items")
    .select("id, order_id, product_id, product_name_snapshot, unit_name_snapshot, quantity, unit_price, discount, line_total")
    .in("order_id", orderIds);

  const itemsByOrderId = new Map<string, DraftOrderItemSummary[]>();
  for (const i of items ?? []) {
    const list = itemsByOrderId.get(i.order_id) ?? [];
    list.push({
      orderItemId: i.id,
      productId: i.product_id,
      productName: i.product_name_snapshot,
      unitName: i.unit_name_snapshot,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      discount: i.discount,
      lineTotal: i.line_total,
    });
    itemsByOrderId.set(i.order_id, list);
  }

  return (orders as unknown as { id: string; order_no: string; contact_id: string | null; note: string | null; subtotal: number; discount_total: number; total: number; contacts: { name: string } | null }[]).map(
    (o) => ({
      id: o.id,
      orderNo: o.order_no,
      contactId: o.contact_id,
      contactName: o.contacts?.name ?? null,
      note: o.note,
      subtotal: o.subtotal,
      discountTotal: o.discount_total,
      total: o.total,
      items: itemsByOrderId.get(o.id) ?? [],
    }),
  );
}

export async function saveDraftOrderItems(
  orderId: string,
  contactId: string | null,
  discountTotal: number,
  note: string | null,
  items: OrderCartLine[],
): Promise<ActionResult<{ subtotal: number; discountTotal: number; total: number }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("save_draft_order_items", {
    p_order_id: orderId,
    // Kiểu sinh từ Supabase không phản ánh đúng việc tham số này nhận NULL
    // (xem ghi chú tương tự ở các action khác dùng RPC).
    p_contact_id: contactId as unknown as string,
    p_discount_total: discountTotal,
    p_note: note as unknown as string,
    p_items: items.map((i) => ({
      product_id: i.productId,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      discount: i.discount,
    })),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { subtotal: data.subtotal, discountTotal: data.discount_total, total: data.total } };
}

export interface PaymentInput {
  method: "cash" | "transfer" | "other";
  amount: number;
  note?: string | null;
}

export async function completeOrder(
  orderId: string,
  payments: PaymentInput[],
): Promise<ActionResult<{ orderNo: string; total: number; paidTotal: number; debtTotal: number }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("complete_order", {
    p_order_id: orderId,
    p_payments: payments.map((p) => ({ method: p.method, amount: p.amount, note: p.note ?? null })),
  });

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: { orderNo: data.order_no, total: data.total, paidTotal: data.paid_total, debtTotal: data.debt_total },
  };
}
