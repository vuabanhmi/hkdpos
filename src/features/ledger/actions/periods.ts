"use server";

import { createSupabaseServerClient } from "@/lib/db/server";
import type { ActionResult } from "@/features/contacts/actions/contacts";
import type { DeclarationPeriod } from "./tax-settings";

export interface LedgerPeriodRow {
  id: string;
  periodType: DeclarationPeriod;
  periodStart: string;
  periodEnd: string;
  status: "open" | "locked";
  lockedAt: string | null;
  lockNote: string | null;
  unlockedAt: string | null;
  unlockReason: string | null;
}

export async function listLedgerPeriods(): Promise<LedgerPeriodRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("ledger_periods")
    .select("id, period_type, period_start, period_end, status, locked_at, lock_note, unlocked_at, unlock_reason")
    .order("period_start", { ascending: false });

  return (data ?? []).map((r) => ({
    id: r.id,
    periodType: r.period_type as DeclarationPeriod,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    status: r.status as "open" | "locked",
    lockedAt: r.locked_at,
    lockNote: r.lock_note,
    unlockedAt: r.unlocked_at,
    unlockReason: r.unlock_reason,
  }));
}

export async function lockPeriod(
  periodType: DeclarationPeriod,
  periodStart: string,
  periodEnd: string,
  note?: string,
): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("lock_period", {
    p_period_type: periodType,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_note: note?.trim() || undefined,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function unlockPeriod(id: string, reason: string): Promise<ActionResult<null>> {
  if (!reason.trim()) return { ok: false, error: "Phải nhập lý do mở khóa" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("unlock_period", { p_id: id, p_reason: reason.trim() });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
