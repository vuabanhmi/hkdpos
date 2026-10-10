-- Bước 1.3b: quầy bán hàng và thống kê theo quầy cuối ngày.
-- Quầy chỉ là chiều thống kê nội bộ, không ảnh hưởng sổ doanh thu/kê khai thuế
-- (Bước 1.6 vẫn chia theo nhóm ngành nghề tính thuế).

-- ---------------------------------------------------------------------------
-- counters
-- ---------------------------------------------------------------------------
create table public.counters (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  manager_name text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default clock_timestamp()
);

alter table public.counters enable row level security;

create policy "counters_select" on public.counters
  for select to authenticated using (public.is_app_user());
create policy "counters_insert" on public.counters
  for insert to authenticated with check (public.is_app_user());
create policy "counters_update" on public.counters
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

-- ---------------------------------------------------------------------------
-- counter_product_groups: một nhóm sản phẩm chỉ thuộc đúng một quầy.
-- ---------------------------------------------------------------------------
create table public.counter_product_groups (
  counter_id uuid not null references public.counters (id),
  product_group_id uuid not null unique references public.product_groups (id)
);

alter table public.counter_product_groups enable row level security;

create policy "counter_product_groups_select" on public.counter_product_groups
  for select to authenticated using (public.is_app_user());
create policy "counter_product_groups_insert" on public.counter_product_groups
  for insert to authenticated with check (public.is_app_user());
create policy "counter_product_groups_update" on public.counter_product_groups
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy "counter_product_groups_delete" on public.counter_product_groups
  for delete to authenticated using (public.is_app_user());

-- ---------------------------------------------------------------------------
-- products.counter_id: gán quầy riêng cho sản phẩm, ghi đè gán quầy của nhóm.
-- ---------------------------------------------------------------------------
alter table public.products add column counter_id uuid references public.counters (id);

create or replace function public.resolve_counter(p_product_id uuid)
returns uuid
language sql
stable
as $$
  select coalesce(
    (select p.counter_id from public.products p where p.id = p_product_id),
    (
      select cpg.counter_id
      from public.products p
      join public.counter_product_groups cpg on cpg.product_group_id = p.group_id
      where p.id = p_product_id
    )
  );
$$;

comment on function public.resolve_counter is
  'Quầy hiệu lực của một sản phẩm: ưu tiên gán riêng ở sản phẩm, nếu không có thì lấy quầy của nhóm sản phẩm, không có thì null.';

-- ---------------------------------------------------------------------------
-- order_items: thêm cột phục vụ thống kê theo quầy. line_discount dùng lại cột
-- `discount` đã có từ Bước 1.3 (không tạo cột trùng dữ liệu).
-- allocated_order_discount: phần giảm giá cả đơn phân bổ theo tỷ lệ line_total
-- của từng dòng trong subtotal, phần dư làm tròn dồn vào dòng cuối của đơn.
-- net_amount = gross_amount - discount - allocated_order_discount (doanh thu
-- thực của dòng, dùng cho báo cáo quầy — khác với line_total vốn chỉ trừ giảm
-- giá dòng, dùng để tính subtotal đơn hàng từ Bước 1.3).
-- ---------------------------------------------------------------------------
alter table public.order_items
  add column counter_id uuid references public.counters (id),
  add column counter_name_snapshot text,
  add column gross_amount bigint,
  add column allocated_order_discount bigint,
  add column net_amount bigint;

alter table public.order_return_items
  add column counter_id uuid references public.counters (id),
  add column counter_name_snapshot text,
  add column gross_amount bigint,
  add column net_amount bigint;

comment on column public.order_return_items.gross_amount is
  'Giá trị gộp của phần trả, số ÂM (giảm doanh thu), dùng cho báo cáo quầy.';
comment on column public.order_return_items.net_amount is
  'Doanh thu thực của phần trả (đã gồm tỷ trọng giảm giá dòng và giảm giá cả đơn), số ÂM, dùng cho báo cáo quầy.';

-- ---------------------------------------------------------------------------
-- Báo cáo theo quầy theo ngày (giờ Việt Nam), tính theo thời điểm hoàn tất đơn
-- (sale) hoặc thời điểm trả hàng (return). Luôn gồm dòng "Chưa gán quầy"
-- (counter_id null) nếu có hoạt động chưa gán quầy — không lọc bỏ null.
-- ---------------------------------------------------------------------------
create or replace function public.counter_daily_report(p_date_from date, p_date_to date)
returns table (
  report_date date,
  counter_id uuid,
  counter_name text,
  order_count bigint,
  total_quantity numeric,
  gross_amount bigint,
  discount_amount bigint,
  return_amount bigint,
  net_amount bigint
)
language sql
stable
as $$
  with sales as (
    select
      (o.completed_at at time zone 'Asia/Ho_Chi_Minh')::date as report_date,
      oi.counter_id,
      coalesce(oi.counter_name_snapshot, 'Chưa gán quầy') as counter_name,
      oi.order_id,
      oi.quantity,
      oi.gross_amount,
      (oi.discount + coalesce(oi.allocated_order_discount, 0)) as discount_amount,
      coalesce(oi.net_amount, 0) as net_amount
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.status = 'completed'
  ),
  sales_agg as (
    select
      report_date,
      counter_id,
      counter_name,
      count(distinct order_id) as order_count,
      sum(quantity) as total_quantity,
      sum(gross_amount) as gross_amount,
      sum(discount_amount) as discount_amount,
      sum(net_amount) as net_amount
    from sales
    where report_date between p_date_from and p_date_to
    group by report_date, counter_id, counter_name
  ),
  returns_agg as (
    select
      (orr.occurred_at at time zone 'Asia/Ho_Chi_Minh')::date as report_date,
      ori.counter_id,
      coalesce(ori.counter_name_snapshot, 'Chưa gán quầy') as counter_name,
      sum(coalesce(ori.gross_amount, 0)) as return_gross,
      sum(coalesce(ori.net_amount, 0)) as return_net
    from public.order_return_items ori
    join public.order_returns orr on orr.id = ori.order_return_id
    where (orr.occurred_at at time zone 'Asia/Ho_Chi_Minh')::date between p_date_from and p_date_to
    group by 1, 2, 3
  )
  select
    coalesce(s.report_date, r.report_date) as report_date,
    coalesce(s.counter_id, r.counter_id) as counter_id,
    coalesce(s.counter_name, r.counter_name, 'Chưa gán quầy') as counter_name,
    coalesce(s.order_count, 0) as order_count,
    coalesce(s.total_quantity, 0) as total_quantity,
    coalesce(s.gross_amount, 0) as gross_amount,
    coalesce(s.discount_amount, 0) as discount_amount,
    coalesce(-r.return_gross, 0) as return_amount,
    coalesce(s.net_amount, 0) + coalesce(r.return_net, 0) as net_amount
  from sales_agg s
  full outer join returns_agg r
    on s.report_date = r.report_date
    and coalesce(s.counter_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(r.counter_id, '00000000-0000-0000-0000-000000000000'::uuid)
  order by 1, 3;
$$;

comment on function public.counter_daily_report is
  'Thống kê bán hàng theo quầy theo ngày (giờ VN). Doanh số gộp/giảm giá/net tính theo ngày hoàn tất đơn; trả hàng tính theo ngày phát sinh trả, vào quầy của dòng hàng gốc.';

grant execute on function public.counter_daily_report(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- complete_order: thêm bước ghi counter_id/gross_amount/allocated_order_discount/
-- net_amount cho từng dòng (giữ nguyên toàn bộ logic trừ kho/thanh toán cũ).
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
  v_line_count int;
  v_line_idx int := 0;
  v_running_discount bigint := 0;
  v_resolved_counter uuid;
  v_counter_name text;
  v_gross bigint;
  v_allocated bigint;
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

  -- Quầy bán hàng: gán counter hiệu lực, tính doanh số gộp và phân bổ giảm giá
  -- cả đơn theo tỷ lệ line_total/subtotal. Phần dư làm tròn dồn vào dòng cuối
  -- (theo created_at, id) để tổng phân bổ khớp đúng discount_total đến từng đồng.
  select count(*) into v_line_count from public.order_items where order_id = p_order_id;

  for v_item in
    select id, product_id, quantity, unit_price, discount, line_total
    from public.order_items
    where order_id = p_order_id
    order by created_at, id
  loop
    v_line_idx := v_line_idx + 1;
    v_resolved_counter := public.resolve_counter(v_item.product_id);
    select name into v_counter_name from public.counters where id = v_resolved_counter;
    v_gross := round(v_item.quantity * v_item.unit_price)::bigint;

    if v_order.subtotal = 0 or v_order.discount_total = 0 then
      v_allocated := 0;
    elsif v_line_idx = v_line_count then
      v_allocated := v_order.discount_total - v_running_discount;
    else
      v_allocated := round(v_order.discount_total * v_item.line_total::numeric / v_order.subtotal)::bigint;
      v_running_discount := v_running_discount + v_allocated;
    end if;

    update public.order_items
      set counter_id = v_resolved_counter,
          counter_name_snapshot = coalesce(v_counter_name, 'Chưa gán quầy'),
          gross_amount = v_gross,
          allocated_order_discount = v_allocated,
          net_amount = v_gross - v_item.discount - v_allocated
      where id = v_item.id;
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

-- ---------------------------------------------------------------------------
-- create_return: thêm counter_id/gross_amount/net_amount (âm) cho dòng trả hàng,
-- lấy theo quầy và tỷ trọng net_amount của dòng gốc.
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
  v_return_gross bigint;
  v_return_net bigint;
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

    select oi.id, oi.product_id, oi.product_name_snapshot, oi.quantity, oi.unit_price, oi.line_total,
           oi.unit_cost_snapshot, oi.counter_id, oi.counter_name_snapshot, oi.net_amount, p.track_stock
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
    v_return_gross := -round(v_quantity * v_order_item.unit_price)::bigint;
    v_return_net := -round(v_quantity * coalesce(v_order_item.net_amount, 0)::numeric / v_order_item.quantity)::bigint;

    insert into public.order_return_items (
      order_return_id, order_item_id, quantity, amount,
      counter_id, counter_name_snapshot, gross_amount, net_amount
    )
    values (
      v_return.id, v_order_item.id, v_quantity, v_amount,
      v_order_item.counter_id, v_order_item.counter_name_snapshot, v_return_gross, v_return_net
    );

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

-- ---------------------------------------------------------------------------
-- Backfill: các order_items đã có trước migration này (đơn đặt/hoàn tất trước
-- khi có quầy) chưa có counter. Chỉ điền gross_amount/allocated_order_discount/
-- net_amount từ dữ liệu đã có sẵn (quantity, unit_price, discount, line_total,
-- orders.subtotal/discount_total) — KHÔNG đụng đến quantity/unit_price/discount/
-- line_total/orders.total nên không làm thay đổi tổng doanh thu cũ. counter_id
-- để null (đúng thực tế: các đơn này bán trước khi quầy tồn tại), hiển thị
-- "Chưa gán quầy" trong báo cáo.
-- ---------------------------------------------------------------------------
do $$
declare
  v_order record;
  v_item record;
  v_line_count int;
  v_line_idx int;
  v_running_discount bigint;
  v_allocated bigint;
  v_gross bigint;
begin
  for v_order in select id, subtotal, discount_total from public.orders loop
    select count(*) into v_line_count from public.order_items where order_id = v_order.id;
    continue when v_line_count = 0;

    v_line_idx := 0;
    v_running_discount := 0;

    for v_item in
      select id, quantity, unit_price, discount, line_total
      from public.order_items
      where order_id = v_order.id
      order by created_at, id
    loop
      v_line_idx := v_line_idx + 1;
      v_gross := round(v_item.quantity * v_item.unit_price)::bigint;

      if v_order.subtotal = 0 or v_order.discount_total = 0 then
        v_allocated := 0;
      elsif v_line_idx = v_line_count then
        v_allocated := v_order.discount_total - v_running_discount;
      else
        v_allocated := round(v_order.discount_total * v_item.line_total::numeric / v_order.subtotal)::bigint;
        v_running_discount := v_running_discount + v_allocated;
      end if;

      update public.order_items
        set gross_amount = v_gross,
            allocated_order_discount = v_allocated,
            net_amount = v_gross - v_item.discount - v_allocated,
            counter_name_snapshot = 'Chưa gán quầy'
        where id = v_item.id and gross_amount is null;
    end loop;
  end loop;
end $$;
