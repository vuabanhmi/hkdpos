"use server";

import { createSupabaseServerClient } from "@/lib/db/server";
import type { ActionResult } from "@/features/contacts/actions/contacts";

export interface CounterRow {
  id: string;
  code: string;
  name: string;
  managerName: string | null;
  sortOrder: number;
  isActive: boolean;
  note: string | null;
}

function mapCounter(row: {
  id: string;
  code: string;
  name: string;
  manager_name: string | null;
  sort_order: number;
  is_active: boolean;
  note: string | null;
}): CounterRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    managerName: row.manager_name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    note: row.note,
  };
}

export async function listCounters(): Promise<CounterRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("counters")
    .select("id, code, name, manager_name, sort_order, is_active, note")
    .order("sort_order")
    .order("name");
  return (data ?? []).map(mapCounter);
}

export interface CounterInput {
  code: string;
  name: string;
  managerName?: string | null;
  sortOrder?: number;
  note?: string | null;
}

export async function createCounter(input: CounterInput): Promise<ActionResult<{ id: string }>> {
  const code = input.code.trim();
  const name = input.name.trim();
  if (!code || !name) return { ok: false, error: "Thiếu mã hoặc tên quầy" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("counters")
    .insert({
      code,
      name,
      manager_name: input.managerName?.trim() || null,
      sort_order: input.sortOrder ?? 0,
      note: input.note?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function updateCounter(id: string, input: CounterInput): Promise<ActionResult<null>> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Thiếu tên quầy" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("counters")
    .update({
      name,
      manager_name: input.managerName?.trim() || null,
      sort_order: input.sortOrder ?? 0,
      note: input.note?.trim() || null,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function setCounterActive(id: string, isActive: boolean): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("counters").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export interface GroupAssignmentRow {
  groupId: string;
  groupName: string;
  counterId: string | null;
}

/** Danh sách mọi nhóm sản phẩm kèm quầy đang gán (null = chưa gán), cho màn hình gán quầy. */
export async function listGroupAssignments(): Promise<GroupAssignmentRow[]> {
  const supabase = await createSupabaseServerClient();
  const [{ data: groups }, { data: assignments }] = await Promise.all([
    supabase.from("product_groups").select("id, name").eq("is_active", true).order("name"),
    supabase.from("counter_product_groups").select("counter_id, product_group_id"),
  ]);

  const counterByGroupId = new Map((assignments ?? []).map((a) => [a.product_group_id, a.counter_id]));

  return (groups ?? []).map((g) => ({
    groupId: g.id,
    groupName: g.name,
    counterId: counterByGroupId.get(g.id) ?? null,
  }));
}

export async function assignGroupToCounter(
  groupId: string,
  counterId: string | null,
): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();

  if (counterId === null) {
    const { error } = await supabase.from("counter_product_groups").delete().eq("product_group_id", groupId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: null };
  }

  const { error } = await supabase
    .from("counter_product_groups")
    .upsert({ product_group_id: groupId, counter_id: counterId }, { onConflict: "product_group_id" });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export interface UnassignedProductRow {
  id: string;
  code: string;
  name: string;
  groupName: string | null;
}

/** Sản phẩm đang hoạt động mà không có quầy hiệu lực (không gán riêng, nhóm cũng chưa gán quầy). */
export async function listProductsWithoutCounter(): Promise<UnassignedProductRow[]> {
  const supabase = await createSupabaseServerClient();
  const [{ data: products }, { data: assignments }] = await Promise.all([
    supabase
      .from("products")
      .select("id, code, name, counter_id, group_id, product_groups(name)")
      .eq("is_active", true),
    supabase.from("counter_product_groups").select("product_group_id"),
  ]);

  const assignedGroupIds = new Set((assignments ?? []).map((a) => a.product_group_id));

  return (
    (products ?? []) as unknown as {
      id: string;
      code: string;
      name: string;
      counter_id: string | null;
      group_id: string | null;
      product_groups: { name: string } | null;
    }[]
  )
    .filter((p) => !p.counter_id && (!p.group_id || !assignedGroupIds.has(p.group_id)))
    .map((p) => ({ id: p.id, code: p.code, name: p.name, groupName: p.product_groups?.name ?? null }));
}

export async function setProductCounter(
  productId: string,
  counterId: string | null,
): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").update({ counter_id: counterId }).eq("id", productId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
