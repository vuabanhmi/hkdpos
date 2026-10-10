-- Bước 1.1: danh mục sản phẩm, bảng giá, lịch sử giá.
-- Quy ước: không hard-delete dữ liệu danh mục/giá, dùng is_active để vô hiệu hóa.
-- price_history là sổ sách giá, chỉ ghi thêm (append-only), chặn UPDATE/DELETE bằng trigger.

-- ---------------------------------------------------------------------------
-- Hàm chặn UPDATE/DELETE dùng chung cho các bảng append-only (price_history và
-- các bảng sổ sách/kho ở các bước sau).
-- ---------------------------------------------------------------------------
create or replace function public.trg_block_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Bảng % chỉ cho phép ghi thêm (append-only), không được sửa hoặc xóa', tg_table_name;
end;
$$;

comment on function public.trg_block_mutation() is
  'Trigger dùng chung: chặn UPDATE và DELETE trên các bảng append-only.';

-- ---------------------------------------------------------------------------
-- units
-- ---------------------------------------------------------------------------
create table public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

alter table public.units enable row level security;

create policy "units_select" on public.units
  for select to authenticated using (public.is_app_user());
create policy "units_insert" on public.units
  for insert to authenticated with check (public.is_app_user());
create policy "units_update" on public.units
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

insert into public.units (name) values
  ('Cái'), ('Chai'), ('Hộp'), ('Gói'), ('Bao'), ('Thùng'),
  ('kg'), ('g'), ('Lít'), ('ml'), ('m'), ('cm'), ('Giờ'), ('Bộ'), ('Cuộn');

-- ---------------------------------------------------------------------------
-- product_groups
-- ---------------------------------------------------------------------------
create table public.product_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.product_groups enable row level security;

create policy "product_groups_select" on public.product_groups
  for select to authenticated using (public.is_app_user());
create policy "product_groups_insert" on public.product_groups
  for insert to authenticated with check (public.is_app_user());
create policy "product_groups_update" on public.product_groups
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

-- ---------------------------------------------------------------------------
-- tax_categories: nhóm ngành nghề tính thuế gắn vào sản phẩm.
-- Chưa gắn tỷ lệ thuế ở bước này (tỷ lệ đọc từ bảng tax_rules ở Bước 1.6).
-- ---------------------------------------------------------------------------
create table public.tax_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.tax_categories enable row level security;

create policy "tax_categories_select" on public.tax_categories
  for select to authenticated using (public.is_app_user());
create policy "tax_categories_insert" on public.tax_categories
  for insert to authenticated with check (public.is_app_user());
create policy "tax_categories_update" on public.tax_categories
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  barcode text,
  unit_id uuid not null references public.units (id),
  group_id uuid references public.product_groups (id),
  tax_category_id uuid references public.tax_categories (id),
  track_stock boolean not null default true,
  cost_price bigint not null default 0 check (cost_price >= 0),
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references public.app_users (id) default auth.uid()
);

create unique index products_barcode_unique on public.products (barcode) where barcode is not null;
create index products_group_id_idx on public.products (group_id);
create index products_tax_category_id_idx on public.products (tax_category_id);
create index products_is_active_idx on public.products (is_active);
create index products_name_idx on public.products (name);

comment on table public.products is
  'Danh mục sản phẩm. Không hard-delete, vô hiệu hóa bằng is_active.';
comment on column public.products.tax_category_id is
  'Nhóm ngành nghề tính thuế. Tỷ lệ thuế đọc từ bảng tax_rules theo ngày hiệu lực (Bước 1.6), không lưu ở đây.';

alter table public.products enable row level security;

create policy "products_select" on public.products
  for select to authenticated using (public.is_app_user());
create policy "products_insert" on public.products
  for insert to authenticated with check (public.is_app_user());
create policy "products_update" on public.products
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

-- ---------------------------------------------------------------------------
-- price_lists
-- ---------------------------------------------------------------------------
create table public.price_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  valid_from date,
  valid_to date,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.app_users (id) default auth.uid()
);

comment on table public.price_lists is
  'Bảng giá. Chỉ được có tối đa một bảng giá is_default = true (ép bằng trigger + unique index).';

alter table public.price_lists enable row level security;

create policy "price_lists_select" on public.price_lists
  for select to authenticated using (public.is_app_user());
create policy "price_lists_insert" on public.price_lists
  for insert to authenticated with check (public.is_app_user());
create policy "price_lists_update" on public.price_lists
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

-- Chỉ cho phép một bảng giá mặc định: khi một dòng được đặt is_default = true,
-- tự bỏ cờ default của các dòng khác trước khi unique index kiểm tra.
create or replace function public.trg_price_lists_single_default()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.price_lists
      set is_default = false
      where id <> new.id and is_default = true;
  end if;
  return new;
end;
$$;

create trigger price_lists_single_default
  before insert or update on public.price_lists
  for each row
  when (new.is_default)
  execute function public.trg_price_lists_single_default();

-- Lớp bảo vệ thứ hai ở mức dữ liệu: không bao giờ có hai dòng is_default = true.
create unique index price_lists_one_default on public.price_lists (is_default) where is_default = true;

insert into public.price_lists (name, is_default, is_active)
values ('Bảng giá chung', true, true);

-- ---------------------------------------------------------------------------
-- price_list_items
-- ---------------------------------------------------------------------------
create table public.price_list_items (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.price_lists (id),
  product_id uuid not null references public.products (id),
  price bigint not null check (price >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.app_users (id) default auth.uid(),
  unique (price_list_id, product_id)
);

create index price_list_items_price_list_id_idx on public.price_list_items (price_list_id);
create index price_list_items_product_id_idx on public.price_list_items (product_id);

alter table public.price_list_items enable row level security;

create policy "price_list_items_select" on public.price_list_items
  for select to authenticated using (public.is_app_user());
create policy "price_list_items_insert" on public.price_list_items
  for insert to authenticated with check (public.is_app_user());
create policy "price_list_items_update" on public.price_list_items
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy "price_list_items_delete" on public.price_list_items
  for delete to authenticated using (public.is_app_user());

-- ---------------------------------------------------------------------------
-- price_history: append-only, ghi tự động bằng trigger trên price_list_items.
-- ---------------------------------------------------------------------------
create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  price_list_id uuid not null references public.price_lists (id),
  product_id uuid not null references public.products (id),
  old_price bigint,
  new_price bigint not null,
  -- clock_timestamp(), không phải now(): now() trả về cùng một giá trị cho mọi câu lệnh
  -- trong một transaction (vd. sửa giá hàng loạt chạy nhiều INSERT trong một lần gọi RPC),
  -- khiến các dòng lịch sử bị trùng changed_at và không thể xác định dòng nào mới nhất.
  changed_at timestamptz not null default clock_timestamp(),
  changed_by uuid references public.app_users (id) default auth.uid(),
  reason text
);

create index price_history_product_id_idx on public.price_history (product_id, changed_at desc);
create index price_history_price_list_id_idx on public.price_history (price_list_id, changed_at desc);

comment on table public.price_history is
  'Lịch sử đổi giá, ghi tự động bằng trigger trên price_list_items. Chỉ INSERT, không UPDATE/DELETE.';

alter table public.price_history enable row level security;

create policy "price_history_select" on public.price_history
  for select to authenticated using (public.is_app_user());
create policy "price_history_insert" on public.price_history
  for insert to authenticated with check (public.is_app_user());

create trigger price_history_block_update
  before update on public.price_history
  for each row execute function public.trg_block_mutation();

create trigger price_history_block_delete
  before delete on public.price_history
  for each row execute function public.trg_block_mutation();

-- Trigger ghi lịch sử giá: chạy sau INSERT/UPDATE trên price_list_items.
-- Lưu cùng giá (UPDATE mà price không đổi) thì không ghi dòng mới.
-- "reason" (lý do đổi giá, tùy chọn) được truyền qua GUC cấp transaction
-- app.price_change_reason, do RPC set_price_list_item_price /
-- bulk_set_price_list_item_prices thiết lập trước khi ghi giá — vì mỗi request
-- PostgREST là một transaction riêng, không thể truyền qua cột phụ trên bảng.
create or replace function public.trg_price_list_items_write_history()
returns trigger
language plpgsql
as $$
declare
  v_reason text := nullif(current_setting('app.price_change_reason', true), '');
begin
  if tg_op = 'INSERT' then
    insert into public.price_history (price_list_id, product_id, old_price, new_price, changed_by, reason)
    values (new.price_list_id, new.product_id, null, new.price, auth.uid(), v_reason);
  elsif tg_op = 'UPDATE' then
    if new.price is distinct from old.price then
      insert into public.price_history (price_list_id, product_id, old_price, new_price, changed_by, reason)
      values (new.price_list_id, new.product_id, old.price, new.price, auth.uid(), v_reason);
    end if;
  end if;
  return new;
end;
$$;

create trigger price_list_items_history
  after insert or update on public.price_list_items
  for each row execute function public.trg_price_list_items_write_history();

-- ---------------------------------------------------------------------------
-- RPC: đổi giá có ghi lý do (reason truyền qua GUC transaction, xem trigger trên).
-- security invoker: chạy bằng quyền người gọi, vẫn bị policy RLS của
-- price_list_items/price_history kiểm tra như bình thường.
-- ---------------------------------------------------------------------------
create or replace function public.set_price_list_item_price(
  p_price_list_id uuid,
  p_product_id uuid,
  p_price bigint,
  p_reason text default null
) returns public.price_list_items
language plpgsql
security invoker
as $$
declare
  v_row public.price_list_items;
begin
  if p_price < 0 then
    raise exception 'Giá bán không được âm';
  end if;

  perform set_config('app.price_change_reason', coalesce(p_reason, ''), true);

  insert into public.price_list_items (price_list_id, product_id, price, updated_by)
  values (p_price_list_id, p_product_id, p_price, auth.uid())
  on conflict (price_list_id, product_id)
  do update set price = excluded.price, updated_at = now(), updated_by = excluded.updated_by
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.set_price_list_item_price is
  'Đổi (hoặc thêm) giá một sản phẩm trong một bảng giá, có ghi lý do tùy chọn vào price_history.';

grant execute on function public.set_price_list_item_price(uuid, uuid, bigint, text) to authenticated;

create or replace function public.bulk_set_price_list_item_prices(
  p_price_list_id uuid,
  p_items jsonb,
  p_reason text default null
) returns setof public.price_list_items
language plpgsql
security invoker
as $$
declare
  v_item jsonb;
  v_row public.price_list_items;
begin
  perform set_config('app.price_change_reason', coalesce(p_reason, ''), true);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if (v_item ->> 'price')::bigint < 0 then
      raise exception 'Giá bán không được âm cho sản phẩm %', v_item ->> 'product_id';
    end if;

    insert into public.price_list_items (price_list_id, product_id, price, updated_by)
    values (p_price_list_id, (v_item ->> 'product_id')::uuid, (v_item ->> 'price')::bigint, auth.uid())
    on conflict (price_list_id, product_id)
    do update set price = excluded.price, updated_at = now(), updated_by = excluded.updated_by
    returning * into v_row;

    return next v_row;
  end loop;
  return;
end;
$$;

comment on function public.bulk_set_price_list_item_prices is
  'Sửa giá hàng loạt trong một bảng giá. p_items: jsonb [{"product_id": uuid, "price": bigint}, ...]. Dùng chung một lý do cho cả lượt sửa.';

grant execute on function public.bulk_set_price_list_item_prices(uuid, jsonb, text) to authenticated;
