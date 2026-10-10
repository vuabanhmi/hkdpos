"use server";

import { createSupabaseServerClient } from "@/lib/db/server";
import { productInputSchema, type ProductInput } from "@/features/products/domain/product";
import type { ActionResult } from "./reference-data";

export interface ProductPickerOption {
  id: string;
  code: string;
  name: string;
  unitName: string;
}

/** Danh sách gọn cho các màn hình chọn sản phẩm (phiếu kho...), chỉ sản phẩm đang hoạt động. */
export async function listActiveProductOptions(): Promise<ProductPickerOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("id, code, name, units(name)")
    .eq("is_active", true)
    .order("name");

  return ((data ?? []) as unknown as { id: string; code: string; name: string; units: { name: string } | null }[]).map(
    (p) => ({ id: p.id, code: p.code, name: p.name, unitName: p.units?.name ?? "" }),
  );
}

export interface ProductListFilters {
  search?: string;
  groupId?: string | "all";
  status?: "all" | "active" | "inactive";
  page: number;
  pageSize: number;
}

export interface ProductListRow {
  id: string;
  code: string;
  name: string;
  barcode: string | null;
  unitId: string;
  unitName: string;
  groupId: string | null;
  groupName: string | null;
  taxCategoryId: string | null;
  taxCategoryName: string | null;
  trackStock: boolean;
  costPrice: number;
  isActive: boolean;
  note: string | null;
  createdAt: string;
}

export interface ProductListResult {
  rows: ProductListRow[];
  total: number;
}

type ProductQueryRow = {
  id: string;
  code: string;
  name: string;
  barcode: string | null;
  unit_id: string;
  group_id: string | null;
  tax_category_id: string | null;
  track_stock: boolean;
  cost_price: number;
  is_active: boolean;
  note: string | null;
  created_at: string;
  units: { name: string } | null;
  product_groups: { name: string } | null;
  tax_categories: { name: string } | null;
};

function mapRow(row: ProductQueryRow): ProductListRow {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    barcode: row.barcode,
    unitId: row.unit_id,
    unitName: row.units?.name ?? "",
    groupId: row.group_id,
    groupName: row.product_groups?.name ?? null,
    taxCategoryId: row.tax_category_id,
    taxCategoryName: row.tax_categories?.name ?? null,
    trackStock: row.track_stock,
    costPrice: row.cost_price,
    isActive: row.is_active,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function listProducts(filters: ProductListFilters): Promise<ProductListResult> {
  const supabase = await createSupabaseServerClient();
  const page = Math.max(1, filters.page);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select(
      "id, code, name, barcode, unit_id, group_id, tax_category_id, track_stock, cost_price, is_active, note, created_at, units(name), product_groups(name), tax_categories(name)",
      { count: "exact" },
    );

  const term = filters.search?.trim();
  if (term) {
    const escaped = term.replace(/[,*]/g, "");
    if (escaped) {
      query = query.or(`code.ilike.*${escaped}*,name.ilike.*${escaped}*,barcode.ilike.*${escaped}*`);
    }
  }

  if (filters.groupId && filters.groupId !== "all") {
    query = query.eq("group_id", filters.groupId);
  }

  if (filters.status === "active") {
    query = query.eq("is_active", true);
  } else if (filters.status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return {
    rows: ((data ?? []) as unknown as ProductQueryRow[]).map(mapRow),
    total: count ?? 0,
  };
}

export async function createProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const supabase = await createSupabaseServerClient();

  let code = parsed.data.code;
  if (!code) {
    const { data: generatedCode, error: genError } = await supabase.rpc("generate_product_code");
    if (genError) return { ok: false, error: genError.message };
    code = generatedCode;
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      code,
      name: parsed.data.name,
      barcode: parsed.data.barcode,
      unit_id: parsed.data.unitId,
      group_id: parsed.data.groupId ?? null,
      tax_category_id: parsed.data.taxCategoryId ?? null,
      track_stock: parsed.data.trackStock,
      cost_price: parsed.data.costPrice,
      note: parsed.data.note,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Mã sản phẩm hoặc mã vạch đã tồn tại" };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, data };
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({
      code: parsed.data.code,
      name: parsed.data.name,
      barcode: parsed.data.barcode,
      unit_id: parsed.data.unitId,
      group_id: parsed.data.groupId ?? null,
      tax_category_id: parsed.data.taxCategoryId ?? null,
      track_stock: parsed.data.trackStock,
      cost_price: parsed.data.costPrice,
      note: parsed.data.note,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Mã sản phẩm hoặc mã vạch đã tồn tại" };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true, data: { id } };
}

export async function setProductActive(id: string, isActive: boolean): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("products").update({ is_active: isActive }).eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export interface ProductDetail extends ProductListRow {
  defaultPrice: number | null;
  counterId: string | null;
  resolvedCounterName: string | null;
}

export async function getProduct(id: string): Promise<ProductDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, code, name, barcode, unit_id, group_id, tax_category_id, track_stock, cost_price, is_active, note, created_at, counter_id, units(name), product_groups(name), tax_categories(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const row = mapRow(data as unknown as ProductQueryRow);
  const counterId = (data as unknown as { counter_id: string | null }).counter_id;

  const { data: priceLists } = await supabase
    .from("price_lists")
    .select("id")
    .eq("is_default", true)
    .maybeSingle();

  let defaultPrice: number | null = null;
  if (priceLists) {
    const { data: priceItem } = await supabase
      .from("price_list_items")
      .select("price")
      .eq("price_list_id", priceLists.id)
      .eq("product_id", id)
      .maybeSingle();
    defaultPrice = priceItem?.price ?? null;
  }

  const { data: resolvedCounterId } = await supabase.rpc("resolve_counter", { p_product_id: id });
  let resolvedCounterName: string | null = null;
  if (resolvedCounterId) {
    const { data: counter } = await supabase.from("counters").select("name").eq("id", resolvedCounterId).maybeSingle();
    resolvedCounterName = counter?.name ?? null;
  }

  return { ...row, defaultPrice, counterId, resolvedCounterName };
}
