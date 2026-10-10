"use server";

import { createSupabaseServerClient } from "@/lib/db/server";
import {
  stockDocumentInputSchema,
  type StockDocType,
  type StockDocumentInput,
} from "@/features/inventory/domain/stock-document";
import type { ActionResult } from "@/features/contacts/actions/contacts";

export interface WarehouseOption {
  id: string;
  name: string;
  isDefault: boolean;
}

export async function listWarehouses(): Promise<WarehouseOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("warehouses")
    .select("id, name, is_default")
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("name");
  return (data ?? []).map((w) => ({ id: w.id, name: w.name, isDefault: w.is_default }));
}

export interface StockDocumentListFilters {
  docType?: StockDocType | "all";
  status?: "all" | "posted" | "voided";
  search?: string;
  page: number;
  pageSize: number;
}

export interface StockDocumentListRow {
  id: string;
  docNo: string;
  docType: StockDocType;
  warehouseName: string;
  contactName: string | null;
  occurredAt: string;
  status: "posted" | "voided";
  note: string | null;
}

export async function listStockDocuments(
  filters: StockDocumentListFilters,
): Promise<{ rows: StockDocumentListRow[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const page = Math.max(1, filters.page);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("stock_documents")
    .select("id, doc_no, doc_type, occurred_at, status, note, warehouses(name), contacts(name)", {
      count: "exact",
    });

  if (filters.docType && filters.docType !== "all") query = query.eq("doc_type", filters.docType);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);

  const term = filters.search?.trim();
  if (term) {
    query = query.ilike("doc_no", `*${term.replace(/[,*]/g, "")}*`);
  }

  const { data, count, error } = await query.order("occurred_at", { ascending: false }).range(from, to);
  if (error) throw new Error(error.message);

  const rows = (
    (data ?? []) as unknown as {
      id: string;
      doc_no: string;
      doc_type: StockDocType;
      occurred_at: string;
      status: "posted" | "voided";
      note: string | null;
      warehouses: { name: string } | null;
      contacts: { name: string } | null;
    }[]
  ).map((r) => ({
    id: r.id,
    docNo: r.doc_no,
    docType: r.doc_type,
    warehouseName: r.warehouses?.name ?? "",
    contactName: r.contacts?.name ?? null,
    occurredAt: r.occurred_at,
    status: r.status,
    note: r.note,
  }));

  return { rows, total: count ?? 0 };
}

export interface StockDocumentLineDetail {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  unitName: string;
  quantity: number;
  unitCost: number | null;
  note: string | null;
}

export interface StockDocumentDetail extends StockDocumentListRow {
  warehouseId: string;
  contactId: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  lines: StockDocumentLineDetail[];
}

export async function getStockDocumentDetail(id: string): Promise<StockDocumentDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data: doc, error } = await supabase
    .from("stock_documents")
    .select(
      "id, doc_no, doc_type, warehouse_id, contact_id, occurred_at, status, note, voided_at, void_reason, warehouses(name), contacts(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !doc) return null;

  const { data: lines } = await supabase
    .from("stock_document_lines")
    .select("id, product_id, quantity, unit_cost, note, products(code, name, units(name))")
    .eq("stock_document_id", id);

  const docRow = doc as unknown as {
    id: string;
    doc_no: string;
    doc_type: StockDocType;
    warehouse_id: string;
    contact_id: string | null;
    occurred_at: string;
    status: "posted" | "voided";
    note: string | null;
    voided_at: string | null;
    void_reason: string | null;
    warehouses: { name: string } | null;
    contacts: { name: string } | null;
  };

  return {
    id: docRow.id,
    docNo: docRow.doc_no,
    docType: docRow.doc_type,
    warehouseId: docRow.warehouse_id,
    warehouseName: docRow.warehouses?.name ?? "",
    contactId: docRow.contact_id,
    contactName: docRow.contacts?.name ?? null,
    occurredAt: docRow.occurred_at,
    status: docRow.status,
    note: docRow.note,
    voidedAt: docRow.voided_at,
    voidReason: docRow.void_reason,
    lines: (
      (lines ?? []) as unknown as {
        id: string;
        product_id: string;
        quantity: number;
        unit_cost: number | null;
        note: string | null;
        products: { code: string; name: string; units: { name: string } | null } | null;
      }[]
    ).map((l) => ({
      id: l.id,
      productId: l.product_id,
      productCode: l.products?.code ?? "",
      productName: l.products?.name ?? "",
      unitName: l.products?.units?.name ?? "",
      quantity: l.quantity,
      unitCost: l.unit_cost,
      note: l.note,
    })),
  };
}

export async function createStockDocument(
  input: StockDocumentInput,
): Promise<ActionResult<{ id: string; docNo: string }>> {
  const parsed = stockDocumentInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("post_stock_document", {
    p_doc_type: parsed.data.docType,
    p_warehouse_id: parsed.data.warehouseId,
    p_contact_id: parsed.data.contactId ?? undefined,
    p_occurred_at: parsed.data.occurredAt,
    p_note: parsed.data.note ?? undefined,
    p_lines: parsed.data.lines.map((line) => ({
      product_id: line.productId,
      quantity: line.quantity,
      unit_cost: line.unitCost ?? null,
      note: line.note ?? null,
    })),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data.id, docNo: data.doc_no } };
}

export async function voidStockDocument(id: string, reason: string): Promise<ActionResult<null>> {
  if (!reason.trim()) return { ok: false, error: "Phải nhập lý do hủy phiếu" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("void_stock_document", {
    p_document_id: id,
    p_reason: reason.trim(),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
