"use server";

import { createSupabaseServerClient } from "@/lib/db/server";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface ReferenceOption {
  id: string;
  name: string;
}

export async function listUnits(): Promise<ReferenceOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("units")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function listProductGroups(): Promise<ReferenceOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("product_groups")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export interface TaxCategoryOption extends ReferenceOption {
  code: string;
  isDefault: boolean;
}

export async function listTaxCategories(): Promise<TaxCategoryOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tax_categories")
    .select("id, name, code, is_default")
    .eq("is_active", true)
    .order("name");
  return (data ?? []).map((t) => ({ id: t.id, name: t.name, code: t.code, isDefault: t.is_default }));
}

export async function setDefaultTaxCategory(id: string): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("tax_categories").update({ is_default: true }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function createProductGroup(name: string): Promise<ActionResult<ReferenceOption>> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Thiếu tên nhóm sản phẩm" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_groups")
    .insert({ name: trimmed })
    .select("id, name")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function createTaxCategory(
  name: string,
  code?: string,
): Promise<ActionResult<TaxCategoryOption>> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, error: "Thiếu tên nhóm ngành nghề tính thuế" };
  }

  const supabase = await createSupabaseServerClient();

  let trimmedCode = code?.trim();
  if (!trimmedCode) {
    const { data: generatedCode, error: genError } = await supabase.rpc("generate_tax_category_code");
    if (genError) return { ok: false, error: genError.message };
    trimmedCode = generatedCode;
  }

  const { data, error } = await supabase
    .from("tax_categories")
    .insert({ name: trimmedName, code: trimmedCode })
    .select("id, name, code, is_default")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data.id, name: data.name, code: data.code, isDefault: data.is_default } };
}

// ---------------------------------------------------------------------------
// Quản lý danh mục (nhóm sản phẩm / đơn vị tính / nhóm ngành nghề tính thuế):
// liệt kê đầy đủ (kể cả đã vô hiệu hóa), sửa, bật/tắt hoạt động.
// ---------------------------------------------------------------------------

export interface ProductGroupManageRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export async function listProductGroupsForManagement(): Promise<ProductGroupManageRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("product_groups")
    .select("id, name, description, is_active")
    .order("name");
  return (data ?? []).map((g) => ({ id: g.id, name: g.name, description: g.description, isActive: g.is_active }));
}

export async function updateProductGroup(
  id: string,
  input: { name: string; description?: string | null },
): Promise<ActionResult<null>> {
  const trimmed = input.name.trim();
  if (!trimmed) return { ok: false, error: "Thiếu tên nhóm sản phẩm" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("product_groups")
    .update({ name: trimmed, description: input.description?.trim() || null })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function setProductGroupActive(id: string, isActive: boolean): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("product_groups").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export interface UnitManageRow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export async function listUnitsForManagement(): Promise<UnitManageRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("units").select("id, name, description, is_active").order("name");
  return (data ?? []).map((u) => ({ id: u.id, name: u.name, description: u.description, isActive: u.is_active }));
}

export async function createUnit(name: string, description?: string | null): Promise<ActionResult<ReferenceOption>> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Thiếu tên đơn vị tính" };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("units")
    .insert({ name: trimmed, description: description?.trim() || null })
    .select("id, name")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function updateUnit(
  id: string,
  input: { name: string; description?: string | null },
): Promise<ActionResult<null>> {
  const trimmed = input.name.trim();
  if (!trimmed) return { ok: false, error: "Thiếu tên đơn vị tính" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("units")
    .update({ name: trimmed, description: input.description?.trim() || null })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function setUnitActive(id: string, isActive: boolean): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("units").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export interface TaxCategoryManageRow extends TaxCategoryOption {
  description: string | null;
  isActive: boolean;
}

export async function listTaxCategoriesForManagement(): Promise<TaxCategoryManageRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tax_categories")
    .select("id, name, code, description, is_default, is_active")
    .order("name");
  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    description: t.description,
    isDefault: t.is_default,
    isActive: t.is_active,
  }));
}

export async function updateTaxCategory(
  id: string,
  input: { name: string; code: string; description?: string | null },
): Promise<ActionResult<null>> {
  const trimmedName = input.name.trim();
  const trimmedCode = input.code.trim();
  if (!trimmedName || !trimmedCode) {
    return { ok: false, error: "Thiếu tên hoặc mã nhóm ngành nghề tính thuế" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tax_categories")
    .update({ name: trimmedName, code: trimmedCode, description: input.description?.trim() || null })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function setTaxCategoryActive(id: string, isActive: boolean): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();

  if (!isActive) {
    const { data: current } = await supabase.from("tax_categories").select("is_default").eq("id", id).maybeSingle();
    if (current?.is_default) {
      return {
        ok: false,
        error: "Không thể tắt nhóm đang là mặc định — hãy đặt nhóm khác làm mặc định trước.",
      };
    }
  }

  const { error } = await supabase.from("tax_categories").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
