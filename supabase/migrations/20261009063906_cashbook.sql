-- Bước 1.4: thu chi.
-- Quy ước: phiếu gốc luôn amount > 0; phiếu đảo (reversed_of not null) cùng
-- kind/category với gốc nhưng amount < 0 — nhờ vậy sum(amount) theo kind tự
-- triệt tiêu đúng phiếu gốc trong mọi báo cáo, không cần logic riêng.

-- ---------------------------------------------------------------------------
-- cash_categories
-- ---------------------------------------------------------------------------
create table public.cash_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('income', 'expense')),
  is_active boolean not null default true,
  created_at timestamptz not null default clock_timestamp()
);

alter table public.cash_categories enable row level security;

create policy "cash_categories_select" on public.cash_categories
  for select to authenticated using (public.is_app_user());
create policy "cash_categories_insert" on public.cash_categories
  for insert to authenticated with check (public.is_app_user());
create policy "cash_categories_update" on public.cash_categories
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

insert into public.cash_categories (name, kind) values
  ('Nhập hàng', 'expense'),
  ('Điện nước', 'expense'),
  ('Thuê mặt bằng', 'expense'),
  ('Lương', 'expense'),
  ('Vận chuyển', 'expense'),
  ('Khác (chi)', 'expense'),
  ('Thu khác', 'income'),
  ('Thu nợ khách', 'income');

-- ---------------------------------------------------------------------------
-- cash_entries: phiếu thu/chi, append-only.
-- ---------------------------------------------------------------------------
create table public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  entry_no text not null unique,
  kind text not null check (kind in ('income', 'expense')),
  category_id uuid not null references public.cash_categories (id),
  contact_id uuid references public.contacts (id),
  amount bigint not null check (amount <> 0),
  method text not null check (method in ('cash', 'transfer')),
  occurred_at timestamptz not null default clock_timestamp(),
  description text,
  evidence_note text,
  reversed_of uuid references public.cash_entries (id),
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid references public.app_users (id) default auth.uid(),
  -- Phiếu gốc (reversed_of null) phải dương; phiếu đảo (reversed_of not null) phải âm.
  constraint cash_entries_sign_matches_reversal check (
    (reversed_of is null and amount > 0) or (reversed_of is not null and amount < 0)
  )
);

create index cash_entries_occurred_at_idx on public.cash_entries (occurred_at);
create index cash_entries_kind_idx on public.cash_entries (kind);
create index cash_entries_reversed_of_idx on public.cash_entries (reversed_of);

alter table public.cash_entries enable row level security;

create policy "cash_entries_select" on public.cash_entries
  for select to authenticated using (public.is_app_user());
create policy "cash_entries_insert" on public.cash_entries
  for insert to authenticated with check (public.is_app_user());

create trigger cash_entries_block_update
  before update on public.cash_entries
  for each row execute function public.trg_block_mutation();
create trigger cash_entries_block_delete
  before delete on public.cash_entries
  for each row execute function public.trg_block_mutation();

-- ---------------------------------------------------------------------------
-- cash_ledger: gộp tiền từ đơn hàng (payments, luôn là thu) và cash_entries,
-- để /cashbook không cần nhập lại tiền bán hàng.
-- ---------------------------------------------------------------------------
create view public.cash_ledger as
select
  'order_payment'::text as source,
  p.id as source_id,
  null::text as entry_no,
  'income'::text as kind,
  null::uuid as category_id,
  null::text as category_name,
  o.contact_id,
  p.method,
  p.amount,
  p.paid_at as occurred_at,
  'Thanh toán đơn ' || o.order_no as description,
  null::uuid as reversed_of
from public.payments p
join public.orders o on o.id = p.order_id
union all
select
  'cash_entry'::text as source,
  ce.id as source_id,
  ce.entry_no,
  ce.kind,
  ce.category_id,
  cc.name as category_name,
  ce.contact_id,
  ce.method,
  ce.amount,
  ce.occurred_at,
  ce.description,
  ce.reversed_of
from public.cash_entries ce
join public.cash_categories cc on cc.id = ce.category_id;

comment on view public.cash_ledger is
  'Dòng tiền gộp từ thanh toán đơn hàng (luôn là thu) và phiếu thu/chi thủ công, theo ngày và hình thức.';

-- ---------------------------------------------------------------------------
-- Sinh số phiếu: PT (thu) / PC (chi) + yyyyMMdd giờ VN + số thứ tự trong ngày.
-- ---------------------------------------------------------------------------
create or replace function public.generate_cash_entry_no(p_kind text, p_occurred_at timestamptz)
returns text
language plpgsql
as $$
declare
  v_prefix text := case p_kind when 'income' then 'PT' else 'PC' end;
  v_date_part text := to_char(p_occurred_at at time zone 'Asia/Ho_Chi_Minh', 'YYYYMMDD');
  v_seq int;
begin
  select count(*) + 1 into v_seq
  from public.cash_entries
  where kind = p_kind
    and to_char(occurred_at at time zone 'Asia/Ho_Chi_Minh', 'YYYYMMDD') = v_date_part;

  return v_prefix || v_date_part || '-' || lpad(v_seq::text, 3, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: tạo phiếu thu/chi.
-- ---------------------------------------------------------------------------
create or replace function public.create_cash_entry(
  p_kind text,
  p_category_id uuid,
  p_amount bigint,
  p_method text,
  p_occurred_at timestamptz,
  p_description text default null,
  p_contact_id uuid default null,
  p_evidence_note text default null
) returns public.cash_entries
language plpgsql
security invoker
as $$
declare
  v_entry public.cash_entries;
  v_category_kind text;
begin
  if p_kind not in ('income', 'expense') then
    raise exception 'Loại phiếu không hợp lệ: %', p_kind;
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Số tiền phải lớn hơn 0';
  end if;
  if p_method not in ('cash', 'transfer') then
    raise exception 'Hình thức thanh toán không hợp lệ: %', p_method;
  end if;

  select kind into v_category_kind from public.cash_categories where id = p_category_id;
  if not found then
    raise exception 'Danh mục không tồn tại';
  end if;
  if v_category_kind <> p_kind then
    raise exception 'Danh mục không khớp loại phiếu (thu/chi)';
  end if;

  insert into public.cash_entries (
    entry_no, kind, category_id, contact_id, amount, method, occurred_at, description, evidence_note
  ) values (
    public.generate_cash_entry_no(p_kind, p_occurred_at), p_kind, p_category_id, p_contact_id, p_amount,
    p_method, p_occurred_at, p_description, p_evidence_note
  )
  returning * into v_entry;

  return v_entry;
end;
$$;

grant execute on function public.create_cash_entry(text, uuid, bigint, text, timestamptz, text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: tạo phiếu đảo cho một phiếu gốc (chưa từng bị đảo).
-- ---------------------------------------------------------------------------
create or replace function public.create_cash_entry_reversal(
  p_entry_id uuid,
  p_reason text
) returns public.cash_entries
language plpgsql
security invoker
as $$
declare
  v_original public.cash_entries;
  v_reversal public.cash_entries;
begin
  select * into v_original from public.cash_entries where id = p_entry_id;
  if not found then
    raise exception 'Không tìm thấy phiếu';
  end if;
  if v_original.reversed_of is not null then
    raise exception 'Không thể tạo phiếu đảo cho một phiếu đảo khác';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Phải nhập lý do tạo phiếu đảo';
  end if;
  if exists (select 1 from public.cash_entries where reversed_of = p_entry_id) then
    raise exception 'Phiếu này đã có phiếu đảo';
  end if;

  insert into public.cash_entries (
    entry_no, kind, category_id, contact_id, amount, method, occurred_at, description, reversed_of
  ) values (
    public.generate_cash_entry_no(v_original.kind, clock_timestamp()), v_original.kind, v_original.category_id,
    v_original.contact_id, -v_original.amount, v_original.method, clock_timestamp(),
    'Đảo phiếu ' || v_original.entry_no || ': ' || p_reason, v_original.id
  )
  returning * into v_reversal;

  return v_reversal;
end;
$$;

grant execute on function public.create_cash_entry_reversal(uuid, text) to authenticated;
