"use server";

import { createSupabaseServerClient } from "@/lib/db/server";
import { contactInputSchema, type ContactInput } from "@/features/contacts/domain/contact";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface ContactListFilters {
  search?: string;
  type?: "all" | "customer" | "supplier";
  status?: "all" | "active" | "inactive";
  page: number;
  pageSize: number;
}

export interface ContactRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxCode: string | null;
  bankName: string | null;
  bankAccount: string | null;
  isCustomer: boolean;
  isSupplier: boolean;
  note: string | null;
  isActive: boolean;
}

type ContactQueryRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_code: string | null;
  bank_name: string | null;
  bank_account: string | null;
  is_customer: boolean;
  is_supplier: boolean;
  note: string | null;
  is_active: boolean;
};

function mapRow(row: ContactQueryRow): ContactRow {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    taxCode: row.tax_code,
    bankName: row.bank_name,
    bankAccount: row.bank_account,
    isCustomer: row.is_customer,
    isSupplier: row.is_supplier,
    note: row.note,
    isActive: row.is_active,
  };
}

export async function listContacts(
  filters: ContactListFilters,
): Promise<{ rows: ContactRow[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const page = Math.max(1, filters.page);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("contacts")
    .select(
      "id, name, phone, email, address, tax_code, bank_name, bank_account, is_customer, is_supplier, note, is_active",
      { count: "exact" },
    );

  const term = filters.search?.trim();
  if (term) {
    const escaped = term.replace(/[,*]/g, "");
    if (escaped) {
      query = query.or(`name.ilike.*${escaped}*,phone.ilike.*${escaped}*,tax_code.ilike.*${escaped}*`);
    }
  }

  if (filters.type === "customer") query = query.eq("is_customer", true);
  if (filters.type === "supplier") query = query.eq("is_supplier", true);
  if (filters.status === "active") query = query.eq("is_active", true);
  if (filters.status === "inactive") query = query.eq("is_active", false);

  const { data, count, error } = await query.order("name").range(from, to);
  if (error) throw new Error(error.message);

  return { rows: ((data ?? []) as ContactQueryRow[]).map(mapRow), total: count ?? 0 };
}

/** Danh sách gọn cho các select (chọn nhà cung cấp trong phiếu nhập...). */
export async function listActiveSuppliers(): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("is_active", true)
    .eq("is_supplier", true)
    .order("name");
  return data ?? [];
}

/** Danh sách gọn cho các select (chọn khách hàng ở /pos, /orders...). */
export async function listActiveCustomers(): Promise<{ id: string; name: string }[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("is_active", true)
    .eq("is_customer", true)
    .order("name");
  return data ?? [];
}

export async function createContact(input: ContactInput): Promise<ActionResult<{ id: string }>> {
  const parsed = contactInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      address: parsed.data.address,
      tax_code: parsed.data.taxCode,
      bank_name: parsed.data.bankName,
      bank_account: parsed.data.bankAccount,
      is_customer: parsed.data.isCustomer,
      is_supplier: parsed.data.isSupplier,
      note: parsed.data.note,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}

export async function updateContact(
  id: string,
  input: ContactInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = contactInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("contacts")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      address: parsed.data.address,
      tax_code: parsed.data.taxCode,
      bank_name: parsed.data.bankName,
      bank_account: parsed.data.bankAccount,
      is_customer: parsed.data.isCustomer,
      is_supplier: parsed.data.isSupplier,
      note: parsed.data.note,
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id } };
}

export async function setContactActive(id: string, isActive: boolean): Promise<ActionResult<null>> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("contacts").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}
