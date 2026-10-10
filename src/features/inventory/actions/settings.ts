"use server";

import { createSupabaseServerClient } from "@/lib/db/server";
import type { ActionResult } from "@/features/contacts/actions/contacts";

export async function getAllowNegativeStock(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("app_settings").select("allow_negative_stock").eq("id", true).maybeSingle();
  return data?.allow_negative_stock ?? false;
}

export async function setAllowNegativeStock(value: boolean): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("app_settings")
    .update({ allow_negative_stock: value, updated_at: new Date().toISOString(), updated_by: user?.id ?? null })
    .eq("id", true);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
