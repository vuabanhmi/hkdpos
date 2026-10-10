"use server";

import ExcelJS from "exceljs";
import { createSupabaseServerClient } from "@/lib/db/server";
import { endOfDayVN, formatDateTimeVN, startOfDayVN } from "@/lib/date";
import { summarizeCashLedger, type CashSummary } from "@/features/cashbook/domain/cash-summary";
import { cashEntryInputSchema, type CashEntryInput } from "@/features/cashbook/domain/cash-entry";
import type { ActionResult } from "@/features/contacts/actions/contacts";

export interface CashCategoryOption {
  id: string;
  name: string;
  kind: "income" | "expense";
}

export async function listCashCategories(kind?: "income" | "expense"): Promise<CashCategoryOption[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("cash_categories").select("id, name, kind").eq("is_active", true);
  if (kind) query = query.eq("kind", kind);
  const { data } = await query.order("name");
  return (data ?? []) as CashCategoryOption[];
}

export interface CashLedgerFilters {
  kind?: "income" | "expense" | "all";
  categoryId?: string | "all";
  method?: "cash" | "transfer" | "all";
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

export interface CashLedgerRow {
  source: "order_payment" | "cash_entry";
  sourceId: string;
  entryNo: string | null;
  kind: "income" | "expense";
  categoryName: string | null;
  contactName: string | null;
  method: "cash" | "transfer";
  amount: number;
  occurredAt: string;
  description: string | null;
  isReversal: boolean;
  hasReversal: boolean;
}

type CashLedgerQueryRow = {
  source: "order_payment" | "cash_entry";
  source_id: string;
  entry_no: string | null;
  kind: "income" | "expense";
  category_id: string | null;
  category_name: string | null;
  contact_id: string | null;
  method: "cash" | "transfer";
  amount: number;
  occurred_at: string;
  description: string | null;
  reversed_of: string | null;
};

async function fetchLedgerRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  filters: Omit<CashLedgerFilters, "page" | "pageSize">,
) {
  let query = supabase.from("cash_ledger").select("*");

  if (filters.kind && filters.kind !== "all") query = query.eq("kind", filters.kind);
  if (filters.categoryId && filters.categoryId !== "all") query = query.eq("category_id", filters.categoryId);
  if (filters.method && filters.method !== "all") query = query.eq("method", filters.method);
  if (filters.dateFrom) query = query.gte("occurred_at", startOfDayVN(new Date(filters.dateFrom)).toISOString());
  if (filters.dateTo) query = query.lte("occurred_at", endOfDayVN(new Date(filters.dateTo)).toISOString());

  const { data, error } = await query.order("occurred_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CashLedgerQueryRow[];
}

async function enrichRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  rows: CashLedgerQueryRow[],
): Promise<CashLedgerRow[]> {
  const contactIds = [...new Set(rows.map((r) => r.contact_id).filter((id): id is string => Boolean(id)))];
  const contactNameById = new Map<string, string>();
  if (contactIds.length > 0) {
    const { data: contacts } = await supabase.from("contacts").select("id, name").in("id", contactIds);
    for (const c of contacts ?? []) contactNameById.set(c.id, c.name);
  }

  const { data: reversedOfRows } = await supabase.from("cash_entries").select("reversed_of").not("reversed_of", "is", null);
  const reversedIds = new Set((reversedOfRows ?? []).map((r) => r.reversed_of as string));

  return rows.map((r) => ({
    source: r.source,
    sourceId: r.source_id,
    entryNo: r.entry_no,
    kind: r.kind,
    categoryName: r.category_name,
    contactName: r.contact_id ? contactNameById.get(r.contact_id) ?? null : null,
    method: r.method,
    amount: r.amount,
    occurredAt: r.occurred_at,
    description: r.description,
    isReversal: r.reversed_of !== null,
    hasReversal: reversedIds.has(r.source_id),
  }));
}

export async function listCashEntries(
  filters: CashLedgerFilters,
): Promise<{ rows: CashLedgerRow[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const allRows = await fetchLedgerRows(supabase, filters);
  const page = Math.max(1, filters.page);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize));
  const from = (page - 1) * pageSize;
  const pageRows = allRows.slice(from, from + pageSize);

  return { rows: await enrichRows(supabase, pageRows), total: allRows.length };
}

export async function getCashSummary(dateFrom?: string, dateTo?: string): Promise<CashSummary> {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchLedgerRows(supabase, { dateFrom, dateTo });
  return summarizeCashLedger(rows.map((r) => ({ kind: r.kind, amount: r.amount })));
}

export async function createCashEntry(
  input: CashEntryInput,
): Promise<ActionResult<{ id: string; entryNo: string }>> {
  const parsed = cashEntryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_cash_entry", {
    p_kind: parsed.data.kind,
    p_category_id: parsed.data.categoryId,
    p_amount: parsed.data.amount,
    p_method: parsed.data.method,
    p_occurred_at: parsed.data.occurredAt,
    p_description: parsed.data.description ?? undefined,
    p_contact_id: parsed.data.contactId ?? undefined,
    p_evidence_note: parsed.data.evidenceNote ?? undefined,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data.id, entryNo: data.entry_no } };
}

export async function createCashEntryReversal(
  entryId: string,
  reason: string,
): Promise<ActionResult<{ entryNo: string }>> {
  if (!reason.trim()) return { ok: false, error: "Phải nhập lý do tạo phiếu đảo" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_cash_entry_reversal", {
    p_entry_id: entryId,
    p_reason: reason.trim(),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { entryNo: data.entry_no } };
}

export async function exportCashEntriesToExcel(
  filters: Omit<CashLedgerFilters, "page" | "pageSize">,
): Promise<ActionResult<{ base64: string; filename: string }>> {
  const supabase = await createSupabaseServerClient();
  const rawRows = await fetchLedgerRows(supabase, filters);
  const rows = await enrichRows(supabase, rawRows);
  const summary = summarizeCashLedger(rows.map((r) => ({ kind: r.kind, amount: r.amount })));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Thu chi");
  sheet.addRow(["Số phiếu", "Loại", "Danh mục", "Đối tác", "Hình thức", "Thời điểm", "Mô tả", "Số tiền"]);
  sheet.getRow(1).font = { bold: true };

  for (const r of rows) {
    sheet.addRow([
      r.entryNo ?? "Bán hàng",
      r.kind === "income" ? "Thu" : "Chi",
      r.categoryName ?? "Bán hàng",
      r.contactName ?? "",
      r.method === "cash" ? "Tiền mặt" : "Chuyển khoản",
      formatDateTimeVN(new Date(r.occurredAt)),
      r.description ?? "",
      r.amount,
    ]);
  }

  sheet.addRow([]);
  const totalRow = sheet.addRow(["Tổng thu", summary.totalIncome]);
  totalRow.font = { bold: true };
  sheet.addRow(["Tổng chi", summary.totalExpense]).font = { bold: true };
  sheet.addRow(["Số dư", summary.balance]).font = { bold: true };

  sheet.columns.forEach((col) => {
    col.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return {
    ok: true,
    data: {
      base64: Buffer.from(buffer).toString("base64"),
      filename: `thu-chi-${new Date().toISOString().slice(0, 10)}.xlsx`,
    },
  };
}
