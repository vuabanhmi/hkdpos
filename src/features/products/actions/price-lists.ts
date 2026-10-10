"use server";

import { createSupabaseServerClient } from "@/lib/db/server";
import type { ActionResult } from "./reference-data";

export interface PriceListRow {
  id: string;
  name: string;
  validFrom: string | null;
  validTo: string | null;
  isDefault: boolean;
  isActive: boolean;
}

function mapPriceList(row: {
  id: string;
  name: string;
  valid_from: string | null;
  valid_to: string | null;
  is_default: boolean;
  is_active: boolean;
}): PriceListRow {
  return {
    id: row.id,
    name: row.name,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    isDefault: row.is_default,
    isActive: row.is_active,
  };
}

export async function listPriceLists(): Promise<PriceListRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("price_lists")
    .select("id, name, valid_from, valid_to, is_default, is_active")
    .order("is_default", { ascending: false })
    .order("name");

  return (data ?? []).map(mapPriceList);
}

export interface PriceListInput {
  name: string;
  validFrom?: string | null;
  validTo?: string | null;
}

export async function createPriceList(input: PriceListInput): Promise<ActionResult<{ id: string }>> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Thiếu tên bảng giá" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("price_lists")
    .insert({ name, valid_from: input.validFrom ?? null, valid_to: input.validTo ?? null })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function updatePriceList(
  id: string,
  input: PriceListInput & { isActive?: boolean },
): Promise<ActionResult<null>> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Thiếu tên bảng giá" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("price_lists")
    .update({
      name,
      valid_from: input.validFrom ?? null,
      valid_to: input.validTo ?? null,
      ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function setDefaultPriceList(id: string): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("price_lists").update({ is_default: true }).eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export interface PriceListItemRow {
  productId: string;
  code: string;
  name: string;
  unitName: string;
  price: number | null;
  updatedAt: string | null;
}

export async function getPriceListItems(priceListId: string): Promise<PriceListItemRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, code, name, units(name), price_list_items(price, updated_at, price_list_id)")
    .eq("is_active", true)
    .eq("price_list_items.price_list_id", priceListId)
    .order("name");

  if (error || !data) return [];

  return (
    data as unknown as {
      id: string;
      code: string;
      name: string;
      units: { name: string } | null;
      price_list_items: { price: number; updated_at: string } | { price: number; updated_at: string }[] | null;
    }[]
  ).map((row) => {
    const item = Array.isArray(row.price_list_items) ? row.price_list_items[0] : row.price_list_items;
    return {
      productId: row.id,
      code: row.code,
      name: row.name,
      unitName: row.units?.name ?? "",
      price: item?.price ?? null,
      updatedAt: item?.updated_at ?? null,
    };
  });
}

export async function setPrice(
  priceListId: string,
  productId: string,
  price: number,
  reason?: string,
): Promise<ActionResult<null>> {
  if (!Number.isInteger(price) || price < 0) {
    return { ok: false, error: "Giá bán phải là số nguyên không âm" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_price_list_item_price", {
    p_price_list_id: priceListId,
    p_product_id: productId,
    p_price: price,
    p_reason: reason?.trim() || undefined,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function bulkSetPrices(
  priceListId: string,
  items: { productId: string; price: number }[],
  reason?: string,
): Promise<ActionResult<null>> {
  for (const item of items) {
    if (!Number.isInteger(item.price) || item.price < 0) {
      return { ok: false, error: "Giá bán phải là số nguyên không âm" };
    }
  }
  if (items.length === 0) return { ok: true, data: null };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("bulk_set_price_list_item_prices", {
    p_price_list_id: priceListId,
    p_items: items.map((item) => ({ product_id: item.productId, price: item.price })),
    p_reason: reason?.trim() || undefined,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export interface PriceHistoryRow {
  id: string;
  priceListId: string;
  priceListName: string;
  oldPrice: number | null;
  newPrice: number;
  changedAt: string;
  reason: string | null;
}

export async function getPriceHistory(
  productId: string,
  priceListId?: string,
): Promise<PriceHistoryRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("price_history")
    .select("id, price_list_id, old_price, new_price, changed_at, reason, price_lists(name)")
    .eq("product_id", productId);

  if (priceListId) {
    query = query.eq("price_list_id", priceListId);
  }

  const { data } = await query.order("changed_at", { ascending: true });

  return (
    (data ?? []) as unknown as {
      id: string;
      price_list_id: string;
      old_price: number | null;
      new_price: number;
      changed_at: string;
      reason: string | null;
      price_lists: { name: string } | null;
    }[]
  ).map((row) => ({
    id: row.id,
    priceListId: row.price_list_id,
    priceListName: row.price_lists?.name ?? "",
    oldPrice: row.old_price,
    newPrice: row.new_price,
    changedAt: row.changed_at,
    reason: row.reason,
  }));
}
