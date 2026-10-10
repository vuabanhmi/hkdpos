"use server";

import { createSupabaseServerClient } from "@/lib/db/server";
import { formatISODateVN } from "@/lib/date";
import type { ActionResult } from "@/features/contacts/actions/contacts";

export interface BusinessProfile {
  name: string | null;
  address: string | null;
  taxCode: string | null;
}

export async function getBusinessProfile(): Promise<BusinessProfile> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("business_profile").select("name, address, tax_code").eq("id", true).maybeSingle();
  return { name: data?.name ?? null, address: data?.address ?? null, taxCode: data?.tax_code ?? null };
}

export async function updateBusinessProfile(input: BusinessProfile): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("business_profile")
    .update({
      name: input.name?.trim() || null,
      address: input.address?.trim() || null,
      tax_code: input.taxCode?.trim() || null,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    })
    .eq("id", true);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export type DeclarationPeriod = "month" | "quarter" | "year";

export interface TaxRuleHistoryEntry {
  id: string;
  value: unknown;
  effectiveFrom: string;
  sourceNote: string | null;
}

export interface TaxConfig {
  bookGroup: string | null;
  declarationPeriod: DeclarationPeriod | null;
  revenueThresholdAmount: number | null;
  revenueWarnPercent: number | null;
  history: {
    bookGroup: TaxRuleHistoryEntry[];
    declarationPeriod: TaxRuleHistoryEntry[];
    revenueThreshold: TaxRuleHistoryEntry[];
  };
}

async function listRuleHistory(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  key: string,
): Promise<TaxRuleHistoryEntry[]> {
  const { data } = await supabase
    .from("tax_rules")
    .select("id, value, effective_from, source_note")
    .eq("key", key)
    .order("effective_from", { ascending: false });
  return (data ?? []).map((r) => ({ id: r.id, value: r.value, effectiveFrom: r.effective_from, sourceNote: r.source_note }));
}

export async function getTaxConfig(): Promise<TaxConfig> {
  const supabase = await createSupabaseServerClient();
  const today = formatISODateVN(new Date());

  const [bookGroupRow, periodRow, thresholdRow, bookGroupHistory, periodHistory, thresholdHistory] = await Promise.all([
    supabase.rpc("get_tax_rule_value", { p_key: "book_group", p_as_of: today }),
    supabase.rpc("get_tax_rule_value", { p_key: "declaration_period", p_as_of: today }),
    supabase.rpc("get_tax_rule_value", { p_key: "revenue_threshold", p_as_of: today }),
    listRuleHistory(supabase, "book_group"),
    listRuleHistory(supabase, "declaration_period"),
    listRuleHistory(supabase, "revenue_threshold"),
  ]);

  const bookGroup = (bookGroupRow.data as { group?: string } | null)?.group ?? null;
  const declarationPeriod = (periodRow.data as { period?: DeclarationPeriod } | null)?.period ?? null;
  const threshold = thresholdRow.data as { amount?: number; warn_percent?: number } | null;

  return {
    bookGroup,
    declarationPeriod,
    revenueThresholdAmount: threshold?.amount ?? null,
    revenueWarnPercent: threshold?.warn_percent ?? null,
    history: { bookGroup: bookGroupHistory, declarationPeriod: periodHistory, revenueThreshold: thresholdHistory },
  };
}

export async function setDeclarationPeriod(
  period: DeclarationPeriod,
  effectiveFrom: string,
  sourceNote?: string,
): Promise<ActionResult<null>> {
  if (!effectiveFrom) return { ok: false, error: "Thiếu ngày hiệu lực" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("tax_rules").insert({
    key: "declaration_period",
    value: { period },
    effective_from: effectiveFrom,
    source_note: sourceNote?.trim() || null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function setRevenueThreshold(
  amount: number,
  warnPercent: number,
  effectiveFrom: string,
  sourceNote?: string,
): Promise<ActionResult<null>> {
  if (!effectiveFrom) return { ok: false, error: "Thiếu ngày hiệu lực" };
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "Ngưỡng doanh thu phải là số nguyên dương" };
  if (warnPercent <= 0 || warnPercent > 1) return { ok: false, error: "Mức cảnh báo phải trong khoảng 0-100%" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("tax_rules").insert({
    key: "revenue_threshold",
    value: { amount, warn_percent: warnPercent },
    effective_from: effectiveFrom,
    source_note: sourceNote?.trim() || null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export interface TaxCategoryRateRow {
  taxCategoryId: string;
  taxCategoryName: string;
  taxCategoryCode: string;
  gtgtRate: number | null;
  tncnRate: number | null;
  effectiveFrom: string | null;
  sourceNote: string | null;
}

export async function listTaxCategoryRates(): Promise<TaxCategoryRateRow[]> {
  const supabase = await createSupabaseServerClient();
  const today = formatISODateVN(new Date());

  const { data: categories } = await supabase.from("tax_categories").select("id, name, code").eq("is_active", true).order("name");

  const rows: TaxCategoryRateRow[] = [];
  for (const tc of categories ?? []) {
    const key = `tax_category_rate:${tc.id}`;
    const { data: valueRow } = await supabase.rpc("get_tax_rule_value", { p_key: key, p_as_of: today });
    const { data: latest } = await supabase
      .from("tax_rules")
      .select("effective_from, source_note")
      .eq("key", key)
      .lte("effective_from", today)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    const value = valueRow as { gtgt_rate?: number; tncn_rate?: number } | null;
    rows.push({
      taxCategoryId: tc.id,
      taxCategoryName: tc.name,
      taxCategoryCode: tc.code,
      gtgtRate: value?.gtgt_rate ?? null,
      tncnRate: value?.tncn_rate ?? null,
      effectiveFrom: latest?.effective_from ?? null,
      sourceNote: latest?.source_note ?? null,
    });
  }

  return rows;
}

export async function setTaxCategoryRate(
  taxCategoryId: string,
  gtgtRate: number,
  tncnRate: number,
  effectiveFrom: string,
  sourceNote?: string,
): Promise<ActionResult<null>> {
  if (!effectiveFrom) return { ok: false, error: "Thiếu ngày hiệu lực" };
  if (gtgtRate < 0 || gtgtRate > 1 || tncnRate < 0 || tncnRate > 1) {
    return { ok: false, error: "Tỷ lệ thuế phải trong khoảng 0-100%" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("tax_rules").insert({
    key: `tax_category_rate:${taxCategoryId}`,
    value: { gtgt_rate: gtgtRate, tncn_rate: tncnRate },
    effective_from: effectiveFrom,
    source_note: sourceNote?.trim() || null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
