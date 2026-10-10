"use server";

import { createSupabaseServerClient } from "@/lib/db/server";
import { MOVEMENT_TYPE_LABELS } from "@/features/inventory/domain/stock-document";
import type { ActionResult } from "@/features/contacts/actions/contacts";

export interface InventoryListFilters {
  search?: string;
  groupId?: string | "all";
  /** Nếu có: xem tồn tại CUỐI ngày này (giờ Việt Nam) thay vì tồn hiện tại. */
  asOfDate?: string | null;
  page: number;
  pageSize: number;
}

export interface InventoryRow {
  productId: string;
  code: string;
  name: string;
  unitName: string;
  groupName: string | null;
  trackStock: boolean;
  minStockQty: number | null;
  quantity: number;
  avgCost: number;
  value: number;
  isBelowMinimum: boolean;
}

export interface InventoryListResult {
  rows: InventoryRow[];
  total: number;
}

export async function listInventory(filters: InventoryListFilters): Promise<InventoryListResult> {
  const supabase = await createSupabaseServerClient();
  const page = Math.max(1, filters.page);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select(
      "id, code, name, min_stock_qty, track_stock, units(name), product_groups(name)",
      { count: "exact" },
    )
    .eq("is_active", true)
    .eq("track_stock", true);

  const term = filters.search?.trim();
  if (term) {
    const escaped = term.replace(/[,*]/g, "");
    if (escaped) {
      query = query.or(`code.ilike.*${escaped}*,name.ilike.*${escaped}*`);
    }
  }
  if (filters.groupId && filters.groupId !== "all") {
    query = query.eq("group_id", filters.groupId);
  }

  const { data, count, error } = await query.order("name").range(from, to);
  if (error) throw new Error(error.message);

  const products = (data ?? []) as unknown as {
    id: string;
    code: string;
    name: string;
    min_stock_qty: number | null;
    track_stock: boolean;
    units: { name: string } | null;
    product_groups: { name: string } | null;
  }[];

  const productIds = products.map((p) => p.id);
  const summaryByProductId = new Map<string, { quantity: number; avg_cost: number; value: number }>();
  if (productIds.length > 0) {
    if (filters.asOfDate) {
      const { data: summaries } = await supabase.rpc("stock_summary_as_of", { p_date: filters.asOfDate });
      for (const s of (summaries ?? []) as { product_id: string; quantity: number; avg_cost: number; value: number }[]) {
        if (!productIds.includes(s.product_id)) continue;
        summaryByProductId.set(s.product_id, { quantity: s.quantity, avg_cost: s.avg_cost, value: s.value });
      }
    } else {
      const { data: summaries } = await supabase
        .from("product_stock_summary")
        .select("product_id, quantity, avg_cost, value")
        .in("product_id", productIds);
      for (const s of summaries ?? []) {
        summaryByProductId.set(s.product_id as string, {
          quantity: (s.quantity as number) ?? 0,
          avg_cost: (s.avg_cost as number) ?? 0,
          value: (s.value as number) ?? 0,
        });
      }
    }
  }

  const rows: InventoryRow[] = products.map((p) => {
    const summary = summaryByProductId.get(p.id) ?? { quantity: 0, avg_cost: 0, value: 0 };
    return {
      productId: p.id,
      code: p.code,
      name: p.name,
      unitName: p.units?.name ?? "",
      groupName: p.product_groups?.name ?? null,
      trackStock: p.track_stock,
      minStockQty: p.min_stock_qty,
      quantity: summary.quantity,
      avgCost: summary.avg_cost,
      value: summary.value,
      isBelowMinimum: p.min_stock_qty !== null && summary.quantity < p.min_stock_qty,
    };
  });

  return { rows, total: count ?? 0 };
}

export interface StockCardRow {
  id: string;
  occurredAt: string;
  movementType: string;
  movementTypeLabel: string;
  warehouseName: string;
  quantity: number;
  unitCost: number;
  avgCostAfter: number;
  docNo: string | null;
  note: string | null;
}

export async function getStockCard(productId: string): Promise<StockCardRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("stock_movements")
    .select("id, occurred_at, movement_type, quantity, unit_cost, avg_cost_after, ref_type, ref_id, note, warehouses(name)")
    .eq("product_id", productId)
    .order("occurred_at", { ascending: false });

  const rows = (data ?? []) as unknown as {
    id: string;
    occurred_at: string;
    movement_type: string;
    quantity: number;
    unit_cost: number;
    avg_cost_after: number;
    ref_type: string | null;
    ref_id: string | null;
    note: string | null;
    warehouses: { name: string } | null;
  }[];

  const docIds = [...new Set(rows.filter((r) => r.ref_type?.startsWith("stock_document") && r.ref_id).map((r) => r.ref_id as string))];
  const docNoById = new Map<string, string>();
  if (docIds.length > 0) {
    const { data: docs } = await supabase.from("stock_documents").select("id, doc_no").in("id", docIds);
    for (const d of docs ?? []) docNoById.set(d.id, d.doc_no);
  }

  return rows.map((r) => ({
    id: r.id,
    occurredAt: r.occurred_at,
    movementType: r.movement_type,
    movementTypeLabel: MOVEMENT_TYPE_LABELS[r.movement_type] ?? r.movement_type,
    warehouseName: r.warehouses?.name ?? "",
    quantity: r.quantity,
    unitCost: r.unit_cost,
    avgCostAfter: r.avg_cost_after,
    docNo: r.ref_id ? docNoById.get(r.ref_id) ?? null : null,
    note: r.note,
  }));
}

/** Chốt tồn thủ công cho một ngày (mặc định hôm nay) — dùng khi chưa có lịch chạy snapshot_stock tự động. */
export async function snapshotStockManually(date: string): Promise<ActionResult<null>> {
  if (!date) return { ok: false, error: "Thiếu ngày cần chốt" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("snapshot_stock", { p_date: date });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
