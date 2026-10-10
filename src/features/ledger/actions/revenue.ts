"use server";

import { createSupabaseServerClient } from "@/lib/db/server";
import {
  manualRevenueEntryInputSchema,
  type ManualRevenueEntryInput,
  type PaymentMethod,
} from "@/features/ledger/domain/manual-revenue-entry";
import type { ActionResult } from "@/features/contacts/actions/contacts";

export interface ManualRevenueEntryRow {
  id: string;
  entryNo: string;
  entryDate: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  taxCategoryId: string;
  taxCategoryName: string;
  evidenceNote: string | null;
  reversedOf: string | null;
  hasReversal: boolean;
}

export async function listManualRevenueEntries(dateFrom?: string, dateTo?: string): Promise<ManualRevenueEntryRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("manual_revenue_entries")
    .select("id, entry_no, entry_date, description, amount, payment_method, tax_category_id, evidence_note, reversed_of, tax_categories(name)");

  if (dateFrom) query = query.gte("entry_date", dateFrom);
  if (dateTo) query = query.lte("entry_date", dateTo);

  const { data, error } = await query.order("entry_date", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as {
    id: string;
    entry_no: string;
    entry_date: string;
    description: string;
    amount: number;
    payment_method: PaymentMethod;
    tax_category_id: string;
    evidence_note: string | null;
    reversed_of: string | null;
    tax_categories: { name: string } | null;
  }[];

  const { data: reversals } = await supabase.from("manual_revenue_entries").select("reversed_of").not("reversed_of", "is", null);
  const reversedIds = new Set((reversals ?? []).map((r) => r.reversed_of as string));

  return rows.map((r) => ({
    id: r.id,
    entryNo: r.entry_no,
    entryDate: r.entry_date,
    description: r.description,
    amount: r.amount,
    paymentMethod: r.payment_method,
    taxCategoryId: r.tax_category_id,
    taxCategoryName: r.tax_categories?.name ?? "",
    evidenceNote: r.evidence_note,
    reversedOf: r.reversed_of,
    hasReversal: reversedIds.has(r.id),
  }));
}

export async function createManualRevenueEntry(
  input: ManualRevenueEntryInput,
): Promise<ActionResult<{ id: string; entryNo: string }>> {
  const parsed = manualRevenueEntryInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_manual_revenue_entry", {
    p_entry_date: parsed.data.entryDate,
    p_description: parsed.data.description,
    p_amount: parsed.data.amount,
    p_payment_method: parsed.data.paymentMethod,
    p_tax_category_id: parsed.data.taxCategoryId,
    p_evidence_note: parsed.data.evidenceNote ?? undefined,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data.id, entryNo: data.entry_no } };
}

export async function createManualRevenueEntryReversal(entryId: string, reason: string): Promise<ActionResult<null>> {
  if (!reason.trim()) return { ok: false, error: "Phải nhập lý do tạo phiếu đảo" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_manual_revenue_entry_reversal", {
    p_entry_id: entryId,
    p_reason: reason.trim(),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
