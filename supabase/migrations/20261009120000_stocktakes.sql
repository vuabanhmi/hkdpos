-- Bước 1.5: tồn cuối ngày theo snapshot, tồn tại một ngày bất kỳ, kiểm kho theo
-- ngày, báo cáo xuất nhập tồn.
--
-- Quyết định thiết kế:
-- - stock_daily_snapshots là dữ liệu PHÁI SINH (cache), không phải sổ sách — cho
--   phép UPDATE (ghi lại/upsert) khi chạy lại snapshot_stock(date), khác với
--   stock_movements (append-only thật).
-- - stock_as_of/stock_as_of_total dùng snapshot gần nhất (nếu có) + cộng dồn các
--   movement sau đó, để không phải quét lại toàn bộ lịch sử mỗi lần tra cứu.
-- - snapshot_stock(date) khi tính cho một ngày LUÔN lấy snapshot gần nhất TRƯỚC
--   ngày đó (snapshot_date < p_date, không lấy chính ngày đang tính) rồi cộng dồn
--   movement — để chạy lại (tính lại) một ngày đã có snapshot vẫn ra kết quả đúng
--   theo stock_movements hiện tại, không bị kẹt vào giá trị cũ của chính nó.
-- - Giá vốn bình quân là một con số DUY NHẤT toàn cục theo sản phẩm (xem Bước 1.2),
--   nên avg_cost_as_of lấy từ avg_cost_after của movement gần nhất (bất kỳ kho) —
--   đúng với mọi kho tại cùng thời điểm.
-- - Phiên kiểm kho chốt system_qty bằng tồn HIỆN TẠI lúc tạo phiên (stock_on_hand,
--   không phải tồn cuối ngày), vì kiểm kho là việc đếm vật lý ngay lúc đó.
-- - Bắt buộc đếm hết các dòng trước khi duyệt — đảm bảo không bỏ sót sản phẩm.

-- ---------------------------------------------------------------------------
-- Hàm mốc ngày theo giờ Việt Nam, dùng chung cho các hàm theo ngày dưới đây.
-- ---------------------------------------------------------------------------
create or replace function public.vn_day_start(p_date date)
returns timestamptz
language sql
immutable
as $$
  select p_date::timestamp at time zone 'Asia/Ho_Chi_Minh';
$$;

create or replace function public.vn_day_end_exclusive(p_date date)
returns timestamptz
language sql
immutable
as $$
  select (p_date + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh';
$$;

comment on function public.vn_day_start is 'Thời điểm 00:00:00 của một ngày theo giờ Việt Nam (dạng timestamptz/UTC).';
comment on function public.vn_day_end_exclusive is 'Thời điểm bắt đầu ngày KẾ TIẾP theo giờ Việt Nam — dùng làm biên trên dạng loại trừ (occurred_at < giá trị này) để lấy đúng "cuối ngày".';

-- ---------------------------------------------------------------------------
-- stock_daily_snapshots: tồn + giá vốn + giá trị cuối mỗi ngày, theo kho.
-- Dữ liệu phái sinh (tính lại được từ stock_movements) nên cho phép UPDATE
-- (ghi lại khi chạy lại snapshot_stock), khác với sổ cái append-only.
-- ---------------------------------------------------------------------------
create table public.stock_daily_snapshots (
  snapshot_date date not null,
  warehouse_id uuid not null references public.warehouses (id),
  product_id uuid not null references public.products (id),
  quantity numeric(14, 3) not null default 0,
  avg_cost bigint not null default 0,
  value bigint not null default 0,
  created_at timestamptz not null default clock_timestamp(),
  primary key (snapshot_date, warehouse_id, product_id)
);

create index stock_daily_snapshots_product_idx on public.stock_daily_snapshots (product_id, snapshot_date);

comment on table public.stock_daily_snapshots is
  'Tồn/giá vốn/giá trị cuối ngày theo kho — dữ liệu phái sinh, sinh bằng snapshot_stock(date), có thể tính lại.';

alter table public.stock_daily_snapshots enable row level security;

create policy "stock_daily_snapshots_select" on public.stock_daily_snapshots
  for select to authenticated using (public.is_app_user());
create policy "stock_daily_snapshots_insert" on public.stock_daily_snapshots
  for insert to authenticated with check (public.is_app_user());
create policy "stock_daily_snapshots_update" on public.stock_daily_snapshots
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

-- ---------------------------------------------------------------------------
-- Tồn / giá vốn tại một ngày bất kỳ (cho tra cứu — dùng snapshot <= ngày hỏi).
-- ---------------------------------------------------------------------------
create or replace function public.stock_as_of(
  p_warehouse_id uuid,
  p_product_id uuid,
  p_date date
) returns numeric
language sql
stable
as $$
  with base as (
    select quantity, snapshot_date
    from public.stock_daily_snapshots
    where warehouse_id = p_warehouse_id and product_id = p_product_id and snapshot_date <= p_date
    order by snapshot_date desc
    limit 1
  )
  select coalesce((select quantity from base), 0) + coalesce((
    select sum(sm.quantity)
    from public.stock_movements sm
    where sm.warehouse_id = p_warehouse_id
      and sm.product_id = p_product_id
      and sm.occurred_at < public.vn_day_end_exclusive(p_date)
      and sm.occurred_at >= coalesce(
        (select public.vn_day_end_exclusive(snapshot_date) from base),
        '-infinity'::timestamptz
      )
  ), 0);
$$;

comment on function public.stock_as_of is
  'Tồn kho của một sản phẩm tại một kho, tính đến CUỐI một ngày bất kỳ (giờ Việt Nam). Dùng snapshot gần nhất (nếu có) + movement sau đó.';

grant execute on function public.stock_as_of(uuid, uuid, date) to authenticated;

create or replace function public.stock_as_of_total(
  p_product_id uuid,
  p_date date
) returns numeric
language sql
stable
as $$
  select coalesce(sum(public.stock_as_of(w.id, p_product_id, p_date)), 0)
  from public.warehouses w;
$$;

comment on function public.stock_as_of_total is 'Tồn kho của một sản phẩm, cộng tất cả các kho, tại cuối một ngày bất kỳ.';

grant execute on function public.stock_as_of_total(uuid, date) to authenticated;

create or replace function public.avg_cost_as_of(
  p_product_id uuid,
  p_date date
) returns bigint
language sql
stable
as $$
  select coalesce(
    (
      select avg_cost_after
      from public.stock_movements
      where product_id = p_product_id and occurred_at < public.vn_day_end_exclusive(p_date)
      order by occurred_at desc, created_at desc
      limit 1
    ),
    0
  );
$$;

comment on function public.avg_cost_as_of is
  'Giá vốn bình quân (toàn cục, mọi kho) của một sản phẩm tại cuối một ngày bất kỳ.';

grant execute on function public.avg_cost_as_of(uuid, date) to authenticated;

-- ---------------------------------------------------------------------------
-- stock_summary_as_of: bản point-in-time của product_stock_summary (Bước 1.2),
-- dùng cho ô "Tồn tại ngày" ở /inventory.
-- ---------------------------------------------------------------------------
create or replace function public.stock_summary_as_of(p_date date)
returns table (product_id uuid, quantity numeric, avg_cost bigint, value bigint)
language plpgsql
stable
as $$
declare
  v_product record;
begin
  for v_product in select id from public.products where track_stock loop
    product_id := v_product.id;
    quantity := public.stock_as_of_total(v_product.id, p_date);
    avg_cost := public.avg_cost_as_of(v_product.id, p_date);
    value := round(quantity * avg_cost)::bigint;
    return next;
  end loop;
end;
$$;

comment on function public.stock_summary_as_of is 'Tồn + giá vốn + giá trị tại cuối một ngày bất kỳ, cho mọi sản phẩm có theo dõi tồn.';

grant execute on function public.stock_summary_as_of(date) to authenticated;

-- ---------------------------------------------------------------------------
-- snapshot_stock: sinh/ghi lại snapshot cuối ngày cho mọi kho x sản phẩm.
-- Luôn lấy snapshot gần nhất TRƯỚC ngày đang tính (snapshot_date < p_date) rồi
-- cộng dồn movement — nên chạy lại cho một ngày đã có snapshot vẫn đúng.
-- ---------------------------------------------------------------------------
create or replace function public.snapshot_stock(p_date date)
returns void
language plpgsql
security invoker
as $$
declare
  v_warehouse record;
  v_product record;
  v_base record;
  v_qty numeric(14, 3);
  v_avg bigint;
begin
  for v_warehouse in select id from public.warehouses loop
    for v_product in select id from public.products where track_stock loop
      select quantity, snapshot_date into v_base
      from public.stock_daily_snapshots
      where warehouse_id = v_warehouse.id and product_id = v_product.id and snapshot_date < p_date
      order by snapshot_date desc
      limit 1;

      v_qty := coalesce(v_base.quantity, 0) + coalesce((
        select sum(sm.quantity)
        from public.stock_movements sm
        where sm.warehouse_id = v_warehouse.id
          and sm.product_id = v_product.id
          and sm.occurred_at < public.vn_day_end_exclusive(p_date)
          and sm.occurred_at >= coalesce(public.vn_day_end_exclusive(v_base.snapshot_date), '-infinity'::timestamptz)
      ), 0);

      v_avg := public.avg_cost_as_of(v_product.id, p_date);

      insert into public.stock_daily_snapshots (snapshot_date, warehouse_id, product_id, quantity, avg_cost, value)
      values (p_date, v_warehouse.id, v_product.id, v_qty, v_avg, round(v_qty * v_avg)::bigint)
      on conflict (snapshot_date, warehouse_id, product_id) do update
        set quantity = excluded.quantity,
            avg_cost = excluded.avg_cost,
            value = excluded.value,
            created_at = clock_timestamp();

      v_base := null;
    end loop;
  end loop;
end;
$$;

comment on function public.snapshot_stock is
  'Sinh/ghi lại stock_daily_snapshots cho một ngày — mọi kho x sản phẩm có theo dõi tồn.';

grant execute on function public.snapshot_stock(date) to authenticated;

-- ---------------------------------------------------------------------------
-- stocktakes / stocktake_lines: phiên kiểm kho theo ngày.
-- ---------------------------------------------------------------------------
create table public.stocktakes (
  id uuid primary key default gen_random_uuid(),
  stocktake_no text not null unique,
  warehouse_id uuid not null references public.warehouses (id),
  stocktake_date date not null,
  snapshot_taken_at timestamptz not null default clock_timestamp(),
  status text not null default 'draft' check (status in ('draft', 'counting', 'approved', 'cancelled')),
  note text,
  approved_by uuid references public.app_users (id),
  approved_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  created_by uuid references public.app_users (id) default auth.uid()
);

create index stocktakes_status_idx on public.stocktakes (status, stocktake_date desc);

alter table public.stocktakes enable row level security;

create policy "stocktakes_select" on public.stocktakes
  for select to authenticated using (public.is_app_user());
create policy "stocktakes_insert" on public.stocktakes
  for insert to authenticated with check (public.is_app_user());
create policy "stocktakes_update" on public.stocktakes
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

create table public.stocktake_lines (
  id uuid primary key default gen_random_uuid(),
  stocktake_id uuid not null references public.stocktakes (id),
  product_id uuid not null references public.products (id),
  system_qty numeric(14, 3) not null,
  counted_qty numeric(14, 3),
  diff_qty numeric(14, 3) generated always as (coalesce(counted_qty, system_qty) - system_qty) stored,
  unit_cost bigint not null default 0,
  diff_value bigint generated always as (
    round((coalesce(counted_qty, system_qty) - system_qty) * unit_cost)
  ) stored,
  reason text,
  unique (stocktake_id, product_id)
);

create index stocktake_lines_stocktake_idx on public.stocktake_lines (stocktake_id);

alter table public.stocktake_lines enable row level security;

create policy "stocktake_lines_select" on public.stocktake_lines
  for select to authenticated using (public.is_app_user());
create policy "stocktake_lines_insert" on public.stocktake_lines
  for insert to authenticated with check (public.is_app_user());
create policy "stocktake_lines_update" on public.stocktake_lines
  for update to authenticated using (public.is_app_user()) with check (public.is_app_user());

-- Khóa sửa dòng đếm khi phiên không còn ở trạng thái draft/counting (đã duyệt
-- hoặc đã hủy) — chặn ngay ở tầng DB, không phụ thuộc đường gọi từ client.
create or replace function public.trg_block_stocktake_line_update_if_locked()
returns trigger
language plpgsql
as $$
declare
  v_status text;
begin
  select status into v_status from public.stocktakes where id = old.stocktake_id;
  if v_status not in ('draft', 'counting') then
    raise exception 'Phiên kiểm kho đã khóa, không thể sửa dòng đếm';
  end if;
  return new;
end;
$$;

create trigger stocktake_lines_block_update_if_locked
  before update on public.stocktake_lines
  for each row execute function public.trg_block_stocktake_line_update_if_locked();

create or replace function public.generate_stocktake_no(p_created_at timestamptz)
returns text
language plpgsql
as $$
declare
  v_date_part text := to_char(p_created_at at time zone 'Asia/Ho_Chi_Minh', 'YYYYMMDD');
  v_seq int;
begin
  select count(*) + 1 into v_seq
  from public.stocktakes
  where to_char(created_at at time zone 'Asia/Ho_Chi_Minh', 'YYYYMMDD') = v_date_part;

  return 'KK' || v_date_part || '-' || lpad(v_seq::text, 3, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: tạo phiên kiểm kho — chốt system_qty bằng tồn HIỆN TẠI (lúc tạo phiên).
-- p_product_ids: null = toàn bộ sản phẩm có theo dõi tồn.
-- ---------------------------------------------------------------------------
create or replace function public.create_stocktake(
  p_warehouse_id uuid,
  p_stocktake_date date,
  p_product_ids uuid[] default null,
  p_note text default null
) returns public.stocktakes
language plpgsql
security invoker
as $$
declare
  v_stocktake public.stocktakes;
  v_now timestamptz := clock_timestamp();
begin
  insert into public.stocktakes (stocktake_no, warehouse_id, stocktake_date, snapshot_taken_at, status, note)
  values (public.generate_stocktake_no(v_now), p_warehouse_id, p_stocktake_date, v_now, 'counting', p_note)
  returning * into v_stocktake;

  insert into public.stocktake_lines (stocktake_id, product_id, system_qty, unit_cost)
  select v_stocktake.id, p.id, public.stock_on_hand(p_warehouse_id, p.id, v_now), p.cost_price
  from public.products p
  where p.track_stock
    and p.is_active
    and (p_product_ids is null or p.id = any (p_product_ids));

  if not exists (select 1 from public.stocktake_lines where stocktake_id = v_stocktake.id) then
    raise exception 'Không có sản phẩm nào để kiểm (kiểm tra lại danh sách sản phẩm đã chọn)';
  end if;

  return v_stocktake;
end;
$$;

comment on function public.create_stocktake is
  'Tạo phiên kiểm kho: chốt system_qty bằng stock_on_hand hiện tại cho các sản phẩm được chọn (hoặc toàn bộ).';

grant execute on function public.create_stocktake(uuid, date, uuid[], text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: duyệt phiên kiểm kho — bắt buộc đã đếm hết, sinh stock_movements loại
-- stocktake_adjust cho các dòng có chênh lệch, khóa phiên.
-- ---------------------------------------------------------------------------
create or replace function public.approve_stocktake(p_stocktake_id uuid)
returns public.stocktakes
language plpgsql
security invoker
as $$
declare
  v_stocktake public.stocktakes;
  v_line record;
  v_allow_negative boolean;
  v_on_hand numeric(14, 3);
begin
  select * into v_stocktake from public.stocktakes where id = p_stocktake_id for update;
  if not found then
    raise exception 'Không tìm thấy phiên kiểm kho';
  end if;
  if v_stocktake.status <> 'counting' then
    raise exception 'Phiên kiểm kho không ở trạng thái đang kiểm, không thể duyệt';
  end if;

  if exists (select 1 from public.stocktake_lines where stocktake_id = p_stocktake_id and counted_qty is null) then
    raise exception 'Còn sản phẩm chưa đếm, không thể duyệt phiên kiểm kho';
  end if;

  select allow_negative_stock into v_allow_negative from public.app_settings where id = true;

  for v_line in
    select * from public.stocktake_lines
    where stocktake_id = p_stocktake_id and diff_qty <> 0
  loop
    if v_line.diff_qty < 0 and not v_allow_negative then
      v_on_hand := public.stock_on_hand(v_stocktake.warehouse_id, v_line.product_id);
      if v_on_hand + v_line.diff_qty < 0 then
        raise exception 'Không thể duyệt: sản phẩm % sẽ bị âm tồn tại kho', v_line.product_id;
      end if;
    end if;

    insert into public.stock_movements (
      warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after,
      ref_type, ref_id, occurred_at, note
    ) values (
      v_stocktake.warehouse_id, v_line.product_id, 'stocktake_adjust', v_line.diff_qty,
      v_line.unit_cost, v_line.unit_cost, 'stocktake', v_stocktake.id, clock_timestamp(),
      coalesce(v_line.reason, 'Điều chỉnh theo kiểm kê ' || v_stocktake.stocktake_no)
    );
  end loop;

  update public.stocktakes
    set status = 'approved', approved_by = auth.uid(), approved_at = clock_timestamp()
    where id = p_stocktake_id
  returning * into v_stocktake;

  return v_stocktake;
end;
$$;

comment on function public.approve_stocktake is
  'Duyệt phiên kiểm kho: sinh stock_movements (stocktake_adjust) cho các dòng chênh lệch, khóa phiên. Bắt buộc đã đếm hết các dòng.';

grant execute on function public.approve_stocktake(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- inventory_flow_report: báo cáo xuất nhập tồn theo khoảng ngày.
-- tồn đầu = stock_as_of(date_from - 1); tồn cuối = stock_as_of(date_to);
-- nhập/xuất = tổng movement có occurred_at trong [date_from, date_to].
-- ---------------------------------------------------------------------------
create or replace function public.inventory_flow_report(
  p_date_from date,
  p_date_to date,
  p_warehouse_id uuid default null,
  p_group_id uuid default null
) returns table (
  product_id uuid,
  product_code text,
  product_name text,
  unit_name text,
  begin_qty numeric,
  in_qty numeric,
  out_qty numeric,
  end_qty numeric,
  begin_value bigint,
  in_value bigint,
  out_value bigint,
  end_value bigint
)
language plpgsql
stable
as $$
declare
  v_product record;
  v_date_before date := p_date_from - 1;
  v_begin_qty numeric(14, 3);
  v_end_qty numeric(14, 3);
  v_begin_avg bigint;
  v_end_avg bigint;
  v_in_qty numeric(14, 3);
  v_out_qty numeric(14, 3);
  v_in_value bigint;
  v_out_value bigint;
begin
  for v_product in
    select p.id, p.code, p.name, u.name as unit_name
    from public.products p
    left join public.units u on u.id = p.unit_id
    where p.track_stock
      and (p_group_id is null or p.group_id = p_group_id)
  loop
    if p_warehouse_id is null then
      v_begin_qty := public.stock_as_of_total(v_product.id, v_date_before);
      v_end_qty := public.stock_as_of_total(v_product.id, p_date_to);
    else
      v_begin_qty := public.stock_as_of(p_warehouse_id, v_product.id, v_date_before);
      v_end_qty := public.stock_as_of(p_warehouse_id, v_product.id, p_date_to);
    end if;

    v_begin_avg := public.avg_cost_as_of(v_product.id, v_date_before);
    v_end_avg := public.avg_cost_as_of(v_product.id, p_date_to);

    select
      coalesce(sum(case when sm.quantity > 0 then sm.quantity else 0 end), 0),
      coalesce(sum(case when sm.quantity < 0 then -sm.quantity else 0 end), 0),
      coalesce(sum(case when sm.quantity > 0 then sm.quantity * sm.unit_cost else 0 end), 0)::bigint,
      coalesce(sum(case when sm.quantity < 0 then -sm.quantity * sm.unit_cost else 0 end), 0)::bigint
    into v_in_qty, v_out_qty, v_in_value, v_out_value
    from public.stock_movements sm
    where sm.product_id = v_product.id
      and (p_warehouse_id is null or sm.warehouse_id = p_warehouse_id)
      and sm.occurred_at >= public.vn_day_start(p_date_from)
      and sm.occurred_at < public.vn_day_end_exclusive(p_date_to);

    product_id := v_product.id;
    product_code := v_product.code;
    product_name := v_product.name;
    unit_name := v_product.unit_name;
    begin_qty := v_begin_qty;
    in_qty := v_in_qty;
    out_qty := v_out_qty;
    end_qty := v_end_qty;
    begin_value := round(v_begin_qty * v_begin_avg)::bigint;
    in_value := v_in_value;
    out_value := v_out_value;
    end_value := round(v_end_qty * v_end_avg)::bigint;

    return next;
  end loop;
end;
$$;

comment on function public.inventory_flow_report is
  'Báo cáo xuất nhập tồn theo khoảng ngày (giờ Việt Nam): tồn đầu + nhập - xuất = tồn cuối, cho cả số lượng và giá trị.';

grant execute on function public.inventory_flow_report(date, date, uuid, uuid) to authenticated;
