-- Bước 1.3: bán hàng và đơn hàng.
-- Quyết định thiết kế:
-- - Đơn nháp được lưu thật ngay khi có dòng hàng đầu tiên (không chỉ giữ ở
--   client), để hỗ trợ nhiều đơn nháp song song sống sót qua tải lại trang.
--   Mỗi lần sửa giỏ hàng, client gửi toàn bộ dòng hàng hiện tại cho RPC
--   save_draft_order_items (thay toàn bộ order_items của đơn đó) — đơn giản
--   hơn CRUD từng dòng, hợp quy mô ứng dụng một hộ kinh doanh.
-- - order_items chỉ sửa/xóa được khi đơn còn status = 'draft' — ép ngay ở RLS
--   (kiểm tra đơn cha), không cần cột cờ hay trigger riêng.
-- - Bán hàng luôn trừ kho mặc định (chưa có lựa chọn kho ở /pos trong bước này).
-- - Hủy đơn dùng adjust_in để trả hàng về kho (bút toán sửa sai, giống cách
--   hủy phiếu kho ở Bước 1.2). Trả hàng (khách trả) dùng return_in riêng qua
--   order_returns/order_return_items — tiền trả tính theo đơn giá hiệu lực
--   của dòng gốc (đã gồm giảm giá dòng): amount = quantity_trả * (line_total / quantity_gốc).
-- - payments, order_returns, order_return_items: append-only (giống stock_movements).

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  contact_id uuid references public.contacts (id),
  status text not null default 'draft' check (status in ('draft', 'completed', 'cancelled')),
  sale_channel text not null default 'counter',
  subtotal bigint not null default 0 check (subtotal >= 0),
  discount_total bigint not null default 0 check (discount_total >= 0),
  total bigint not null default 0 check (total >= 0),
  paid_total bigint not null default 0 check (paid_total >= 0),
  debt_total bigint not null default 0 check (debt_total >= 0),
  note text,
  ordered_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid references public.app_users (id) default auth.uid()
);

create index orders_status_idx on public.orders (status, ordered_at desc);
create index orders_contact_id_idx on public.orders (contact_id);

alter table public.orders enable row level security;

create policy "orders_select" on public.orders
  for select to authenticated using (public.is_app_user());
create policy "orders_insert" on public.orders
  for insert to authenticated with check (public.is_app_user());
create policy "orders_update" on public.orders
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

-- ---------------------------------------------------------------------------
-- order_items: lưu bản sao tên/giá/thuế tại thời điểm bán, không tham chiếu
-- giá hiện tại. Chỉ sửa/xóa được khi đơn cha còn ở trạng thái draft.
-- ---------------------------------------------------------------------------
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  product_id uuid not null references public.products (id),
  product_code_snapshot text not null,
  product_name_snapshot text not null,
  unit_name_snapshot text not null,
  tax_category_id_snapshot uuid references public.tax_categories (id),
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price bigint not null check (unit_price >= 0),
  discount bigint not null default 0 check (discount >= 0),
  line_total bigint not null check (line_total >= 0),
  unit_cost_snapshot bigint,
  created_at timestamptz not null default clock_timestamp()
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

alter table public.order_items enable row level security;

create policy "order_items_select" on public.order_items
  for select to authenticated using (public.is_app_user());
create policy "order_items_insert" on public.order_items
  for insert to authenticated with check (
    public.is_app_user()
    and exists (select 1 from public.orders o where o.id = order_items.order_id and o.status = 'draft')
  );
create policy "order_items_update" on public.order_items
  for update to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.status = 'draft'))
  with check (exists (select 1 from public.orders o where o.id = order_items.order_id and o.status = 'draft'));
create policy "order_items_delete" on public.order_items
  for delete to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.status = 'draft'));

-- ---------------------------------------------------------------------------
-- payments: append-only.
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  method text not null check (method in ('cash', 'transfer', 'other')),
  amount bigint not null check (amount > 0),
  paid_at timestamptz not null default clock_timestamp(),
  note text,
  created_by uuid references public.app_users (id) default auth.uid()
);

create index payments_order_id_idx on public.payments (order_id);

alter table public.payments enable row level security;

create policy "payments_select" on public.payments
  for select to authenticated using (public.is_app_user());
create policy "payments_insert" on public.payments
  for insert to authenticated with check (public.is_app_user());

create trigger payments_block_update
  before update on public.payments
  for each row execute function public.trg_block_mutation();
create trigger payments_block_delete
  before delete on public.payments
  for each row execute function public.trg_block_mutation();

-- ---------------------------------------------------------------------------
-- order_returns / order_return_items: trả hàng một phần hoặc toàn bộ. Append-only.
-- ---------------------------------------------------------------------------
create table public.order_returns (
  id uuid primary key default gen_random_uuid(),
  return_no text not null unique,
  order_id uuid not null references public.orders (id),
  occurred_at timestamptz not null default clock_timestamp(),
  reason text not null,
  total_amount bigint not null default 0 check (total_amount >= 0),
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid references public.app_users (id) default auth.uid()
);

create index order_returns_order_id_idx on public.order_returns (order_id);

alter table public.order_returns enable row level security;

create policy "order_returns_select" on public.order_returns
  for select to authenticated using (public.is_app_user());
create policy "order_returns_insert" on public.order_returns
  for insert to authenticated with check (public.is_app_user());
-- Cho phép UPDATE để RPC create_return (security invoker) điền total_amount sau khi
-- tính xong các dòng; không có cách nào khác sửa được từ client vì chỉ RPC gọi UPDATE này.
create policy "order_returns_update" on public.order_returns
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

create table public.order_return_items (
  id uuid primary key default gen_random_uuid(),
  order_return_id uuid not null references public.order_returns (id),
  order_item_id uuid not null references public.order_items (id),
  quantity numeric(14, 3) not null check (quantity > 0),
  amount bigint not null check (amount >= 0)
);

create index order_return_items_return_id_idx on public.order_return_items (order_return_id);
create index order_return_items_order_item_id_idx on public.order_return_items (order_item_id);

alter table public.order_return_items enable row level security;

create policy "order_return_items_select" on public.order_return_items
  for select to authenticated using (public.is_app_user());
create policy "order_return_items_insert" on public.order_return_items
  for insert to authenticated with check (public.is_app_user());

create trigger order_return_items_block_update
  before update on public.order_return_items
  for each row execute function public.trg_block_mutation();
create trigger order_return_items_block_delete
  before delete on public.order_return_items
  for each row execute function public.trg_block_mutation();

-- ---------------------------------------------------------------------------
-- Sinh số đơn / số phiếu trả hàng theo ngày giờ Việt Nam.
-- ---------------------------------------------------------------------------
create or replace function public.generate_order_no(p_occurred_at timestamptz)
returns text
language plpgsql
as $$
declare
  v_date_part text := to_char(p_occurred_at at time zone 'Asia/Ho_Chi_Minh', 'YYYYMMDD');
  v_seq int;
begin
  select count(*) + 1 into v_seq
  from public.orders
  where to_char(ordered_at at time zone 'Asia/Ho_Chi_Minh', 'YYYYMMDD') = v_date_part;

  return 'DH' || v_date_part || '-' || lpad(v_seq::text, 3, '0');
end;
$$;

create or replace function public.generate_return_no(p_occurred_at timestamptz)
returns text
language plpgsql
as $$
declare
  v_date_part text := to_char(p_occurred_at at time zone 'Asia/Ho_Chi_Minh', 'YYYYMMDD');
  v_seq int;
begin
  select count(*) + 1 into v_seq
  from public.order_returns
  where to_char(occurred_at at time zone 'Asia/Ho_Chi_Minh', 'YYYYMMDD') = v_date_part;

  return 'TH' || v_date_part || '-' || lpad(v_seq::text, 3, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: tạo đơn nháp mới (tab mới ở /pos).
-- ---------------------------------------------------------------------------
create or replace function public.create_draft_order(
  p_contact_id uuid default null,
  p_sale_channel text default 'counter'
) returns public.orders
language plpgsql
security invoker
as $$
declare
  v_order public.orders;
  v_now timestamptz := clock_timestamp();
begin
  insert into public.orders (order_no, contact_id, sale_channel, status, ordered_at)
  values (public.generate_order_no(v_now), p_contact_id, p_sale_channel, 'draft', v_now)
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.create_draft_order(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: lưu toàn bộ giỏ hàng hiện tại cho một đơn nháp (thay hết order_items cũ).
-- p_items: jsonb [{"product_id": uuid, "quantity": numeric, "unit_price": bigint, "discount": bigint}]
-- ---------------------------------------------------------------------------
create or replace function public.save_draft_order_items(
  p_order_id uuid,
  p_contact_id uuid,
  p_discount_total bigint,
  p_note text,
  p_items jsonb
) returns public.orders
language plpgsql
security invoker
as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_product record;
  v_quantity numeric(14, 3);
  v_unit_price bigint;
  v_discount bigint;
  v_line_total bigint;
  v_subtotal bigint := 0;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;
  if v_order.status <> 'draft' then
    raise exception 'Chỉ sửa được đơn còn ở trạng thái nháp';
  end if;

  delete from public.order_items where order_id = p_order_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_quantity := (v_item ->> 'quantity')::numeric(14, 3);
    v_unit_price := (v_item ->> 'unit_price')::bigint;
    v_discount := coalesce((v_item ->> 'discount')::bigint, 0);

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Số lượng dòng hàng phải lớn hơn 0';
    end if;
    if v_unit_price is null or v_unit_price < 0 then
      raise exception 'Đơn giá không hợp lệ';
    end if;
    if v_discount < 0 then
      raise exception 'Giảm giá dòng hàng không được âm';
    end if;

    select p.code, p.name, p.tax_category_id, u.name as unit_name
      into v_product
      from public.products p
      join public.units u on u.id = p.unit_id
      where p.id = (v_item ->> 'product_id')::uuid;
    if not found then
      raise exception 'Sản phẩm không tồn tại: %', v_item ->> 'product_id';
    end if;

    v_line_total := round(v_quantity * v_unit_price)::bigint - v_discount;
    if v_line_total < 0 then
      raise exception 'Giảm giá dòng hàng vượt quá giá trị dòng';
    end if;

    insert into public.order_items (
      order_id, product_id, product_code_snapshot, product_name_snapshot, unit_name_snapshot,
      tax_category_id_snapshot, quantity, unit_price, discount, line_total
    ) values (
      p_order_id, (v_item ->> 'product_id')::uuid, v_product.code, v_product.name, v_product.unit_name,
      v_product.tax_category_id, v_quantity, v_unit_price, v_discount, v_line_total
    );

    v_subtotal := v_subtotal + v_line_total;
  end loop;

  if p_discount_total < 0 or p_discount_total > v_subtotal then
    raise exception 'Giảm giá cả đơn không hợp lệ';
  end if;

  update public.orders
    set contact_id = p_contact_id,
        note = p_note,
        subtotal = v_subtotal,
        discount_total = p_discount_total,
        total = v_subtotal - p_discount_total,
        debt_total = greatest((v_subtotal - p_discount_total) - paid_total, 0)
    where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.save_draft_order_items(uuid, uuid, bigint, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: hoàn tất đơn — kiểm tồn, trừ kho (sale_out, giá vốn hiện tại, không đổi
-- giá vốn bình quân), ghi payments, chuyển trạng thái completed.
-- p_payments: jsonb [{"method": "cash"|"transfer"|"other", "amount": bigint, "note": text|null}]
-- ---------------------------------------------------------------------------
create or replace function public.complete_order(
  p_order_id uuid,
  p_payments jsonb
) returns public.orders
language plpgsql
security invoker
as $$
declare
  v_order public.orders;
  v_item record;
  v_warehouse_id uuid;
  v_allow_negative boolean;
  v_on_hand numeric(14, 3);
  v_avg_cost bigint;
  v_payment jsonb;
  v_paid_total bigint := 0;
  v_amount bigint;
  v_method text;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;
  if v_order.status <> 'draft' then
    raise exception 'Chỉ hoàn tất được đơn còn ở trạng thái nháp';
  end if;
  if not exists (select 1 from public.order_items where order_id = p_order_id) then
    raise exception 'Đơn hàng chưa có sản phẩm nào';
  end if;

  select id into v_warehouse_id from public.warehouses where is_default = true;
  select allow_negative_stock into v_allow_negative from public.app_settings where id = true;

  for v_item in
    select oi.id, oi.product_id, oi.quantity, p.track_stock
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id
  loop
    if v_item.track_stock then
      select cost_price into v_avg_cost from public.products where id = v_item.product_id for update;

      if not v_allow_negative then
        v_on_hand := public.stock_on_hand(v_warehouse_id, v_item.product_id);
        if v_on_hand - v_item.quantity < 0 then
          raise exception 'Sản phẩm % không đủ tồn để bán (tồn %, cần %)',
            v_item.product_id, v_on_hand, v_item.quantity;
        end if;
      end if;

      insert into public.stock_movements (
        warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after,
        ref_type, ref_id, occurred_at, note
      ) values (
        v_warehouse_id, v_item.product_id, 'sale_out', -v_item.quantity, v_avg_cost, v_avg_cost,
        'order', p_order_id, clock_timestamp(), null
      );

      update public.order_items set unit_cost_snapshot = v_avg_cost where id = v_item.id;
    end if;
  end loop;

  for v_payment in select * from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb))
  loop
    v_method := v_payment ->> 'method';
    v_amount := (v_payment ->> 'amount')::bigint;

    if v_amount is null or v_amount <= 0 then
      raise exception 'Số tiền thanh toán phải lớn hơn 0';
    end if;
    if v_method not in ('cash', 'transfer', 'other') then
      raise exception 'Hình thức thanh toán không hợp lệ: %', v_method;
    end if;

    insert into public.payments (order_id, method, amount, note)
    values (p_order_id, v_method, v_amount, v_payment ->> 'note');

    v_paid_total := v_paid_total + v_amount;
  end loop;

  update public.orders
    set status = 'completed',
        completed_at = clock_timestamp(),
        paid_total = v_paid_total,
        debt_total = greatest(total - v_paid_total, 0)
    where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.complete_order(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: hủy đơn. Đơn draft chỉ cần đổi trạng thái (chưa trừ kho). Đơn completed
-- sinh dòng đảo adjust_in cho mọi stock_movements liên quan.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_order(
  p_order_id uuid,
  p_reason text
) returns public.orders
language plpgsql
security invoker
as $$
declare
  v_order public.orders;
  v_movement record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'Đơn đã được hủy trước đó';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Phải nhập lý do hủy đơn';
  end if;

  if v_order.status = 'completed' then
    for v_movement in
      select * from public.stock_movements where ref_type = 'order' and ref_id = p_order_id
    loop
      insert into public.stock_movements (
        warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after,
        ref_type, ref_id, occurred_at, note
      ) values (
        v_movement.warehouse_id, v_movement.product_id, 'adjust_in', -v_movement.quantity,
        v_movement.unit_cost, v_movement.unit_cost,
        'order_cancel', p_order_id, clock_timestamp(), 'Hủy đơn ' || v_order.order_no || ': ' || p_reason
      );
    end loop;
  end if;

  update public.orders
    set status = 'cancelled', cancelled_at = clock_timestamp(), cancel_reason = p_reason
    where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.cancel_order(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: trả hàng một phần hoặc toàn bộ cho một đơn đã hoàn tất.
-- p_lines: jsonb [{"order_item_id": uuid, "quantity": numeric}]
-- ---------------------------------------------------------------------------
create or replace function public.create_return(
  p_order_id uuid,
  p_lines jsonb,
  p_reason text
) returns public.order_returns
language plpgsql
security invoker
as $$
declare
  v_order public.orders;
  v_return public.order_returns;
  v_line jsonb;
  v_order_item record;
  v_quantity numeric(14, 3);
  v_already_returned numeric(14, 3);
  v_effective_unit_price numeric;
  v_amount bigint;
  v_total_amount bigint := 0;
  v_warehouse_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;
  if v_order.status <> 'completed' then
    raise exception 'Chỉ trả hàng được cho đơn đã hoàn tất';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'Phải nhập lý do trả hàng';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Phải chọn ít nhất một dòng hàng để trả';
  end if;

  select id into v_warehouse_id from public.warehouses where is_default = true;

  insert into public.order_returns (return_no, order_id, reason, total_amount)
  values (public.generate_return_no(clock_timestamp()), p_order_id, p_reason, 0)
  returning * into v_return;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_quantity := (v_line ->> 'quantity')::numeric(14, 3);
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Số lượng trả phải lớn hơn 0';
    end if;

    select oi.id, oi.product_id, oi.product_name_snapshot, oi.quantity, oi.line_total,
           oi.unit_cost_snapshot, p.track_stock
      into v_order_item
      from public.order_items oi
      join public.products p on p.id = oi.product_id
      where oi.id = (v_line ->> 'order_item_id')::uuid and oi.order_id = p_order_id;
    if not found then
      raise exception 'Dòng hàng không tồn tại trong đơn này';
    end if;

    select coalesce(sum(ori.quantity), 0) into v_already_returned
      from public.order_return_items ori
      where ori.order_item_id = v_order_item.id;

    if v_quantity > (v_order_item.quantity - v_already_returned) then
      raise exception 'Số lượng trả vượt quá số lượng còn có thể trả của dòng %',
        v_order_item.product_name_snapshot;
    end if;

    v_effective_unit_price := v_order_item.line_total::numeric / v_order_item.quantity;
    v_amount := round(v_quantity * v_effective_unit_price);

    insert into public.order_return_items (order_return_id, order_item_id, quantity, amount)
    values (v_return.id, v_order_item.id, v_quantity, v_amount);

    if v_order_item.track_stock then
      insert into public.stock_movements (
        warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after,
        ref_type, ref_id, occurred_at, note
      ) values (
        v_warehouse_id, v_order_item.product_id, 'return_in', v_quantity,
        coalesce(v_order_item.unit_cost_snapshot, 0), coalesce(v_order_item.unit_cost_snapshot, 0),
        'order_return', v_return.id, clock_timestamp(), 'Trả hàng đơn ' || v_order.order_no
      );
    end if;

    v_total_amount := v_total_amount + v_amount;
  end loop;

  update public.order_returns set total_amount = v_total_amount where id = v_return.id
  returning * into v_return;

  return v_return;
end;
$$;

grant execute on function public.create_return(uuid, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: ghi nhận thanh toán bổ sung cho đơn còn nợ.
-- ---------------------------------------------------------------------------
create or replace function public.record_order_payment(
  p_order_id uuid,
  p_method text,
  p_amount bigint,
  p_note text default null
) returns public.orders
language plpgsql
security invoker
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Không tìm thấy đơn hàng';
  end if;
  if v_order.status <> 'completed' then
    raise exception 'Chỉ ghi nhận thanh toán cho đơn đã hoàn tất';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Số tiền thanh toán phải lớn hơn 0';
  end if;
  if p_method not in ('cash', 'transfer', 'other') then
    raise exception 'Hình thức thanh toán không hợp lệ';
  end if;

  insert into public.payments (order_id, method, amount, note)
  values (p_order_id, p_method, p_amount, p_note);

  update public.orders
    set paid_total = paid_total + p_amount,
        debt_total = greatest(total - (paid_total + p_amount), 0)
    where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function public.record_order_payment(uuid, text, bigint, text) to authenticated;
