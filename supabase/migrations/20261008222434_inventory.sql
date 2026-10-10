-- Bước 1.2: kho nền tảng và tồn kho.
-- Quyết định thiết kế (xem thêm trong hàm post_stock_document):
-- - Không tạo bảng purchase_price_history riêng: dùng lại stock_movements
--   (lọc movement_type = 'purchase_in') để tra giá nhập theo thời gian.
-- - Giá vốn bình quân tính TOÀN CỤC theo sản phẩm (không theo từng kho), vì
--   products.cost_price là một cột duy nhất. Chỉ phiếu NHẬP (purchase_in) làm
--   thay đổi giá vốn bình quân; xuất kho và điều chỉnh kho chỉ định giá theo
--   giá vốn hiện tại, không đổi giá vốn bình quân (đúng kế toán giá vốn bình
--   quân di động chuẩn — chỉ có thông tin giá mới khi mua hàng).
-- - Chặn tồn âm kiểm theo TỪNG KHO (vật lý: không thể xuất vượt tồn của kho đó).
-- - warehouse_id đặt trên stock_documents (một phiếu = một kho).
-- - Hủy phiếu luôn sinh dòng đảo bằng adjust_in/adjust_out, không tái dùng loại
--   gốc — hủy phiếu là một bút toán điều chỉnh, không phải nghiệp vụ thật.
--   Hủy KHÔNG tính lại giá vốn bình quân lịch sử (không khả thi nếu đã có nhập
--   hàng khác xảy ra sau đó); chỉ đưa tồn về đúng, giá vốn hiện tại giữ nguyên.

-- ---------------------------------------------------------------------------
-- contacts: khách hàng và nhà cung cấp dùng chung, có cờ loại.
-- ---------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  tax_code text,
  bank_name text,
  bank_account text,
  is_customer boolean not null default false,
  is_supplier boolean not null default false,
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid references public.app_users (id) default auth.uid()
);

create index contacts_name_idx on public.contacts (name);
create index contacts_is_active_idx on public.contacts (is_active);

alter table public.contacts enable row level security;

create policy "contacts_select" on public.contacts
  for select to authenticated using (public.is_app_user());
create policy "contacts_insert" on public.contacts
  for insert to authenticated with check (public.is_app_user());
create policy "contacts_update" on public.contacts
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

-- ---------------------------------------------------------------------------
-- warehouses
-- ---------------------------------------------------------------------------
create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default clock_timestamp()
);

alter table public.warehouses enable row level security;

create policy "warehouses_select" on public.warehouses
  for select to authenticated using (public.is_app_user());
create policy "warehouses_insert" on public.warehouses
  for insert to authenticated with check (public.is_app_user());
create policy "warehouses_update" on public.warehouses
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

-- Chỉ cho phép một kho mặc định, cùng cơ chế với price_lists ở Bước 1.1.
create or replace function public.trg_warehouses_single_default()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.warehouses
      set is_default = false
      where id <> new.id and is_default = true;
  end if;
  return new;
end;
$$;

create trigger warehouses_single_default
  before insert or update on public.warehouses
  for each row
  when (new.is_default)
  execute function public.trg_warehouses_single_default();

create unique index warehouses_one_default on public.warehouses (is_default) where is_default = true;

insert into public.warehouses (code, name, is_default) values ('KHO01', 'Kho bán hàng', true);

-- ---------------------------------------------------------------------------
-- products: thêm mức tồn tối thiểu để cảnh báo ở /inventory.
-- ---------------------------------------------------------------------------
alter table public.products add column min_stock_qty numeric(14, 3);

-- ---------------------------------------------------------------------------
-- app_settings: bảng cấu hình một dòng duy nhất (id luôn = true).
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id boolean primary key default true check (id = true),
  allow_negative_stock boolean not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid references public.app_users (id)
);

alter table public.app_settings enable row level security;

create policy "app_settings_select" on public.app_settings
  for select to authenticated using (public.is_app_user());
create policy "app_settings_update" on public.app_settings
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

insert into public.app_settings (id, allow_negative_stock) values (true, false);

-- ---------------------------------------------------------------------------
-- stock_documents: phiếu nhập / xuất / điều chỉnh. Mỗi phiếu nhiều dòng.
-- ---------------------------------------------------------------------------
create table public.stock_documents (
  id uuid primary key default gen_random_uuid(),
  doc_no text not null unique,
  doc_type text not null check (doc_type in ('purchase', 'issue', 'adjustment')),
  warehouse_id uuid not null references public.warehouses (id),
  contact_id uuid references public.contacts (id),
  occurred_at timestamptz not null default clock_timestamp(),
  note text,
  status text not null default 'posted' check (status in ('posted', 'voided')),
  voided_at timestamptz,
  voided_by uuid references public.app_users (id),
  void_reason text,
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid references public.app_users (id) default auth.uid()
);

create index stock_documents_doc_type_idx on public.stock_documents (doc_type, status, occurred_at desc);
create index stock_documents_warehouse_id_idx on public.stock_documents (warehouse_id);

alter table public.stock_documents enable row level security;

create policy "stock_documents_select" on public.stock_documents
  for select to authenticated using (public.is_app_user());
create policy "stock_documents_insert" on public.stock_documents
  for insert to authenticated with check (public.is_app_user());
-- Cho phép UPDATE để RPC void_stock_document (chạy security invoker) đổi được
-- status; không có chính sách nào khác hạn chế cột cụ thể vì đây là app nội bộ
-- một hộ, tin tưởng mọi app_user, giống cách price_lists/price_list_items đã làm.
create policy "stock_documents_update" on public.stock_documents
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

-- ---------------------------------------------------------------------------
-- stock_document_lines: chi tiết từng dòng hàng của phiếu.
-- Chiều dấu của quantity: phiếu nhập/xuất luôn lưu số dương (độ lớn); phiếu
-- điều chỉnh lưu trực tiếp số có dấu (dương = tăng, âm = giảm).
-- ---------------------------------------------------------------------------
create table public.stock_document_lines (
  id uuid primary key default gen_random_uuid(),
  stock_document_id uuid not null references public.stock_documents (id),
  product_id uuid not null references public.products (id),
  quantity numeric(14, 3) not null check (quantity <> 0),
  unit_cost bigint check (unit_cost is null or unit_cost >= 0),
  note text
);

create index stock_document_lines_doc_id_idx on public.stock_document_lines (stock_document_id);
create index stock_document_lines_product_id_idx on public.stock_document_lines (product_id);

alter table public.stock_document_lines enable row level security;

create policy "stock_document_lines_select" on public.stock_document_lines
  for select to authenticated using (public.is_app_user());
create policy "stock_document_lines_insert" on public.stock_document_lines
  for insert to authenticated with check (public.is_app_user());

-- ---------------------------------------------------------------------------
-- stock_movements: sổ cái xuất nhập kho, append-only.
-- ---------------------------------------------------------------------------
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  warehouse_id uuid not null references public.warehouses (id),
  product_id uuid not null references public.products (id),
  movement_type text not null check (
    movement_type in (
      'purchase_in', 'sale_out', 'return_in', 'return_out',
      'adjust_in', 'adjust_out', 'stocktake_adjust', 'transfer_in', 'transfer_out'
    )
  ),
  -- Dấu dương khi nhập, âm khi xuất (bất kể movement_type nào).
  quantity numeric(14, 3) not null check (quantity <> 0),
  unit_cost bigint not null default 0 check (unit_cost >= 0),
  avg_cost_after bigint not null default 0 check (avg_cost_after >= 0),
  ref_type text,
  ref_id uuid,
  occurred_at timestamptz not null default clock_timestamp(),
  note text,
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid references public.app_users (id) default auth.uid()
);

create index stock_movements_product_occurred_idx on public.stock_movements (product_id, occurred_at);
create index stock_movements_warehouse_product_idx on public.stock_movements (warehouse_id, product_id, occurred_at);
create index stock_movements_ref_idx on public.stock_movements (ref_type, ref_id);

comment on table public.stock_movements is
  'Sổ cái xuất nhập kho. Append-only — chỉ INSERT, chặn UPDATE/DELETE bằng trigger.';

alter table public.stock_movements enable row level security;

create policy "stock_movements_select" on public.stock_movements
  for select to authenticated using (public.is_app_user());
create policy "stock_movements_insert" on public.stock_movements
  for insert to authenticated with check (public.is_app_user());

create trigger stock_movements_block_update
  before update on public.stock_movements
  for each row execute function public.trg_block_mutation();

create trigger stock_movements_block_delete
  before delete on public.stock_movements
  for each row execute function public.trg_block_mutation();

-- ---------------------------------------------------------------------------
-- Hàm tính tồn kho.
-- ---------------------------------------------------------------------------
create or replace function public.stock_on_hand(
  p_warehouse_id uuid,
  p_product_id uuid,
  p_as_of timestamptz default clock_timestamp()
) returns numeric
language sql
stable
as $$
  select coalesce(sum(quantity), 0)
  from public.stock_movements
  where warehouse_id = p_warehouse_id
    and product_id = p_product_id
    and occurred_at <= p_as_of;
$$;

comment on function public.stock_on_hand is 'Tồn kho của một sản phẩm tại một kho, tính đến thời điểm as_of.';

grant execute on function public.stock_on_hand(uuid, uuid, timestamptz) to authenticated;

create or replace function public.stock_on_hand_total(
  p_product_id uuid,
  p_as_of timestamptz default clock_timestamp()
) returns numeric
language sql
stable
as $$
  select coalesce(sum(quantity), 0)
  from public.stock_movements
  where product_id = p_product_id
    and occurred_at <= p_as_of;
$$;

comment on function public.stock_on_hand_total is
  'Tồn kho của một sản phẩm, cộng tất cả các kho, dùng để tính giá vốn bình quân toàn cục.';

grant execute on function public.stock_on_hand_total(uuid, timestamptz) to authenticated;

-- View tổng hợp tồn + giá vốn + giá trị tồn cho màn hình /inventory.
create view public.product_stock_summary as
select
  p.id as product_id,
  coalesce(sum(sm.quantity), 0)::numeric(14, 3) as quantity,
  p.cost_price as avg_cost,
  (coalesce(sum(sm.quantity), 0) * p.cost_price)::bigint as value
from public.products p
left join public.stock_movements sm on sm.product_id = p.id
group by p.id, p.cost_price;

comment on view public.product_stock_summary is
  'Tồn kho hiện tại (cộng tất cả các kho) và giá trị tồn theo sản phẩm, dùng cho /inventory.';

-- ---------------------------------------------------------------------------
-- Sinh số phiếu: <prefix><yyyyMMdd theo giờ VN>-<số thứ tự 3 chữ số trong ngày>.
-- ---------------------------------------------------------------------------
create or replace function public.generate_stock_doc_no(p_doc_type text, p_occurred_at timestamptz)
returns text
language plpgsql
as $$
declare
  v_prefix text := case p_doc_type
    when 'purchase' then 'PN'
    when 'issue' then 'PX'
    when 'adjustment' then 'DC'
    else 'PK'
  end;
  v_date_part text := to_char(p_occurred_at at time zone 'Asia/Ho_Chi_Minh', 'YYYYMMDD');
  v_seq int;
begin
  select count(*) + 1 into v_seq
  from public.stock_documents
  where doc_type = p_doc_type
    and to_char(occurred_at at time zone 'Asia/Ho_Chi_Minh', 'YYYYMMDD') = v_date_part;

  return v_prefix || v_date_part || '-' || lpad(v_seq::text, 3, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: ghi sổ một phiếu nhập/xuất/điều chỉnh, sinh stock_movements, cập nhật
-- giá vốn bình quân. Chạy trong một transaction (một lệnh gọi RPC = một
-- transaction), khóa dòng products bằng `for update` để tránh hai phiếu cùng
-- sửa giá vốn của một sản phẩm đồng thời.
-- p_lines: jsonb [{"product_id": uuid, "quantity": numeric, "unit_cost": bigint|null, "note": text|null}]
-- ---------------------------------------------------------------------------
create or replace function public.post_stock_document(
  p_doc_type text,
  p_warehouse_id uuid,
  p_lines jsonb,
  p_contact_id uuid default null,
  p_occurred_at timestamptz default clock_timestamp(),
  p_note text default null
) returns public.stock_documents
language plpgsql
security invoker
as $$
declare
  v_doc public.stock_documents;
  v_line jsonb;
  v_product_id uuid;
  v_quantity numeric(14, 3);
  v_unit_cost bigint;
  v_line_note text;
  v_movement_type text;
  v_current_qty numeric(14, 3);
  v_current_avg bigint;
  v_new_avg bigint;
  v_allow_negative boolean;
  v_on_hand numeric(14, 3);
begin
  if p_doc_type not in ('purchase', 'issue', 'adjustment') then
    raise exception 'Loại phiếu không hợp lệ: %', p_doc_type;
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Phiếu phải có ít nhất một dòng hàng';
  end if;

  select allow_negative_stock into v_allow_negative from public.app_settings where id = true;

  insert into public.stock_documents (doc_no, doc_type, warehouse_id, contact_id, occurred_at, note, status)
  values (
    public.generate_stock_doc_no(p_doc_type, p_occurred_at),
    p_doc_type, p_warehouse_id, p_contact_id, p_occurred_at, p_note, 'posted'
  )
  returning * into v_doc;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_product_id := (v_line ->> 'product_id')::uuid;
    v_quantity := (v_line ->> 'quantity')::numeric(14, 3);
    v_unit_cost := case when v_line ->> 'unit_cost' is null then null else (v_line ->> 'unit_cost')::bigint end;
    v_line_note := v_line ->> 'note';

    if v_quantity is null or v_quantity = 0 then
      raise exception 'Số lượng dòng hàng không được bằng 0';
    end if;

    if p_doc_type in ('purchase', 'issue') and v_quantity <= 0 then
      raise exception 'Số lượng dòng hàng phải lớn hơn 0 cho phiếu nhập/xuất';
    end if;

    if p_doc_type = 'purchase' and (v_unit_cost is null or v_unit_cost < 0) then
      raise exception 'Phiếu nhập: phải có giá nhập hợp lệ cho từng dòng';
    end if;

    insert into public.stock_document_lines (stock_document_id, product_id, quantity, unit_cost, note)
    values (v_doc.id, v_product_id, v_quantity, v_unit_cost, v_line_note);

    -- Khóa dòng sản phẩm trước khi đọc/ghi giá vốn bình quân.
    select cost_price into v_current_avg from public.products where id = v_product_id for update;
    if not found then
      raise exception 'Sản phẩm không tồn tại: %', v_product_id;
    end if;

    if p_doc_type = 'purchase' then
      v_movement_type := 'purchase_in';
      v_current_qty := public.stock_on_hand_total(v_product_id, p_occurred_at);
      if v_current_qty + v_quantity <= 0 then
        v_new_avg := v_unit_cost;
      else
        v_new_avg := round((v_current_qty * v_current_avg + v_quantity * v_unit_cost) / (v_current_qty + v_quantity));
      end if;
    else
      -- Xuất kho / điều chỉnh: không đổi giá vốn bình quân, định giá theo giá vốn hiện tại.
      v_new_avg := v_current_avg;
      v_unit_cost := v_current_avg;
      if p_doc_type = 'issue' then
        v_movement_type := 'adjust_out';
        v_quantity := -v_quantity;
      else
        v_movement_type := case when v_quantity > 0 then 'adjust_in' else 'adjust_out' end;
      end if;
    end if;

    if v_quantity < 0 and not v_allow_negative then
      v_on_hand := public.stock_on_hand(p_warehouse_id, v_product_id, p_occurred_at);
      if v_on_hand + v_quantity < 0 then
        raise exception 'Sản phẩm % không đủ tồn tại kho (tồn %, cần xuất %)',
          v_product_id, v_on_hand, -v_quantity;
      end if;
    end if;

    insert into public.stock_movements (
      warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after,
      ref_type, ref_id, occurred_at, note
    ) values (
      p_warehouse_id, v_product_id, v_movement_type, v_quantity, v_unit_cost, v_new_avg,
      'stock_document', v_doc.id, p_occurred_at, v_line_note
    );

    update public.products set cost_price = v_new_avg where id = v_product_id;
  end loop;

  return v_doc;
end;
$$;

comment on function public.post_stock_document is
  'Ghi sổ một phiếu nhập/xuất/điều chỉnh: tạo stock_documents + stock_document_lines, sinh stock_movements, cập nhật giá vốn bình quân (chỉ phiếu nhập).';

grant execute on function public.post_stock_document(text, uuid, jsonb, uuid, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: hủy phiếu — sinh dòng đảo (adjust_in/adjust_out), không sửa/xóa dòng cũ.
-- ---------------------------------------------------------------------------
create or replace function public.void_stock_document(
  p_document_id uuid,
  p_reason text
) returns public.stock_documents
language plpgsql
security invoker
as $$
declare
  v_doc public.stock_documents;
  v_line record;
  v_reversed_type text;
  v_reversed_qty numeric(14, 3);
  v_current_avg bigint;
  v_allow_negative boolean;
  v_on_hand numeric(14, 3);
begin
  select * into v_doc from public.stock_documents where id = p_document_id for update;
  if not found then
    raise exception 'Không tìm thấy phiếu';
  end if;
  if v_doc.status = 'voided' then
    raise exception 'Phiếu đã được hủy trước đó';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Phải nhập lý do hủy phiếu';
  end if;

  select allow_negative_stock into v_allow_negative from public.app_settings where id = true;

  for v_line in
    select * from public.stock_movements
    where ref_type = 'stock_document' and ref_id = v_doc.id
    order by created_at
  loop
    v_reversed_qty := -v_line.quantity;
    v_reversed_type := case when v_reversed_qty > 0 then 'adjust_in' else 'adjust_out' end;

    select cost_price into v_current_avg from public.products where id = v_line.product_id for update;

    if v_reversed_qty < 0 and not v_allow_negative then
      v_on_hand := public.stock_on_hand(v_line.warehouse_id, v_line.product_id);
      if v_on_hand + v_reversed_qty < 0 then
        raise exception 'Không thể hủy phiếu: sản phẩm % sẽ bị âm tồn tại kho', v_line.product_id;
      end if;
    end if;

    insert into public.stock_movements (
      warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after,
      ref_type, ref_id, occurred_at, note
    ) values (
      v_line.warehouse_id, v_line.product_id, v_reversed_type, v_reversed_qty, v_current_avg, v_current_avg,
      'stock_document_void', v_doc.id, clock_timestamp(),
      'Hủy phiếu ' || v_doc.doc_no || ': ' || p_reason
    );
  end loop;

  update public.stock_documents
    set status = 'voided', voided_at = clock_timestamp(), voided_by = auth.uid(), void_reason = p_reason
    where id = v_doc.id
  returning * into v_doc;

  return v_doc;
end;
$$;

comment on function public.void_stock_document is
  'Hủy một phiếu đã ghi sổ: sinh dòng đảo cho mọi stock_movements liên quan, đặt status = voided. Không tính lại giá vốn bình quân lịch sử.';

grant execute on function public.void_stock_document(uuid, text) to authenticated;
