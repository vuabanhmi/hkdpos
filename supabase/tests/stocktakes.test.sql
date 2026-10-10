-- pgTAP test cho Bước 1.5: snapshot, tồn tại ngày bất kỳ, kiểm kho, báo cáo
-- xuất nhập tồn. Chạy bằng: supabase test db

begin;
select plan(18);

create temp table test_ids (label text primary key, id uuid);

insert into test_ids values ('unit', gen_random_uuid());
insert into test_ids values ('product', gen_random_uuid());
insert into test_ids values ('product2', gen_random_uuid());

insert into public.units (id, name)
values ((select id from test_ids where label = 'unit'), 'Đơn vị test kiểm kho');

insert into public.products (id, code, name, unit_id, cost_price)
values (
  (select id from test_ids where label = 'product'), 'TESTKK01', 'Sản phẩm test kiểm kho 1',
  (select id from test_ids where label = 'unit'), 1000
);

insert into public.products (id, code, name, unit_id, cost_price)
values (
  (select id from test_ids where label = 'product2'), 'TESTKK02', 'Sản phẩm test kiểm kho 2',
  (select id from test_ids where label = 'unit'), 2000
);

-- Dựng lịch sử tồn trực tiếp vào stock_movements (bỏ qua post_stock_document để
-- kiểm soát chính xác occurred_at theo các ngày test cố định):
-- 10/01/2026: nhập 20 x 1.000. 11/01/2026: bán 5 x 1.000. 12/01/2026: điều chỉnh tăng 100 x 1.000.
insert into public.stock_movements (warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after, occurred_at)
values (
  (select id from public.warehouses where code = 'KHO01'),
  (select id from test_ids where label = 'product'),
  'purchase_in', 20, 1000, 1000,
  '2026-01-10 10:00:00'::timestamp at time zone 'Asia/Ho_Chi_Minh'
);

insert into public.stock_movements (warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after, occurred_at)
values (
  (select id from public.warehouses where code = 'KHO01'),
  (select id from test_ids where label = 'product'),
  'sale_out', -5, 1000, 1000,
  '2026-01-11 09:00:00'::timestamp at time zone 'Asia/Ho_Chi_Minh'
);

-- ---------------------------------------------------------------------------
-- 1) snapshot_stock khớp với tính trực tiếp từ movements (tồn cuối 11/01 = 15).
-- ---------------------------------------------------------------------------
select public.snapshot_stock('2026-01-11'::date);

select is(
  (select quantity from public.stock_daily_snapshots
    where snapshot_date = '2026-01-11' and warehouse_id = (select id from public.warehouses where code = 'KHO01')
      and product_id = (select id from test_ids where label = 'product')),
  15::numeric,
  'Snapshot 11/01: tồn = 20 - 5 = 15'
);

select is(
  (select avg_cost from public.stock_daily_snapshots
    where snapshot_date = '2026-01-11' and warehouse_id = (select id from public.warehouses where code = 'KHO01')
      and product_id = (select id from test_ids where label = 'product')),
  1000::bigint,
  'Snapshot 11/01: giá vốn bình quân = 1.000'
);

select is(
  (select value from public.stock_daily_snapshots
    where snapshot_date = '2026-01-11' and warehouse_id = (select id from public.warehouses where code = 'KHO01')
      and product_id = (select id from test_ids where label = 'product')),
  15000::bigint,
  'Snapshot 11/01: giá trị = 15 x 1.000 = 15.000'
);

-- ---------------------------------------------------------------------------
-- 2) Tồn tại ngày quá khứ không đổi sau khi phát sinh giao dịch ở ngày sau đó.
-- ---------------------------------------------------------------------------
insert into public.stock_movements (warehouse_id, product_id, movement_type, quantity, unit_cost, avg_cost_after, occurred_at)
values (
  (select id from public.warehouses where code = 'KHO01'),
  (select id from test_ids where label = 'product'),
  'adjust_in', 100, 1000, 1000,
  '2026-01-12 08:00:00'::timestamp at time zone 'Asia/Ho_Chi_Minh'
);

select is(
  public.stock_as_of(
    (select id from public.warehouses where code = 'KHO01'),
    (select id from test_ids where label = 'product'),
    '2026-01-11'::date
  ),
  15::numeric,
  'Tồn tại ngày 11/01 vẫn = 15 dù đã có giao dịch ngày 12/01'
);

select is(
  public.stock_as_of(
    (select id from public.warehouses where code = 'KHO01'),
    (select id from test_ids where label = 'product'),
    '2026-01-12'::date
  ),
  115::numeric,
  'Tồn tại ngày 12/01 = 15 + 100 = 115'
);

-- ---------------------------------------------------------------------------
-- 3) Duyệt kiểm kho sinh đúng điều chỉnh, khóa phiên.
-- ---------------------------------------------------------------------------
select public.create_stocktake(
  (select id from public.warehouses where code = 'KHO01'),
  current_date,
  array[(select id from test_ids where label = 'product')]
);

insert into test_ids values ('stocktake1', (select id from public.stocktakes order by created_at desc limit 1));

select is(
  (select system_qty from public.stocktake_lines
    where stocktake_id = (select id from test_ids where label = 'stocktake1')
      and product_id = (select id from test_ids where label = 'product')),
  115::numeric,
  'Tạo phiên kiểm kho: system_qty chốt đúng tồn hiện tại = 115'
);

update public.stocktake_lines
  set counted_qty = 110
  where stocktake_id = (select id from test_ids where label = 'stocktake1')
    and product_id = (select id from test_ids where label = 'product');

select is(
  (select diff_qty from public.stocktake_lines
    where stocktake_id = (select id from test_ids where label = 'stocktake1')
      and product_id = (select id from test_ids where label = 'product')),
  (-5)::numeric,
  'Đếm được 110 (hệ thống 115): chênh lệch = -5'
);

select public.approve_stocktake((select id from test_ids where label = 'stocktake1'));

select is(
  (select status from public.stocktakes where id = (select id from test_ids where label = 'stocktake1')),
  'approved',
  'Duyệt phiên kiểm kho: trạng thái chuyển sang approved'
);

select is(
  (select quantity from public.stock_movements
    where ref_type = 'stocktake' and ref_id = (select id from test_ids where label = 'stocktake1')
      and movement_type = 'stocktake_adjust'),
  (-5)::numeric,
  'Duyệt kiểm kho sinh đúng 1 dòng stocktake_adjust với số lượng = -5'
);

select is(
  public.stock_on_hand(
    (select id from public.warehouses where code = 'KHO01'),
    (select id from test_ids where label = 'product')
  ),
  110::numeric,
  'Tồn sau khi duyệt kiểm kho = 110'
);

select throws_ok(
  $$ update public.stocktake_lines set counted_qty = 999
       where stocktake_id = (select id from test_ids where label = 'stocktake1')
         and product_id = (select id from test_ids where label = 'product') $$,
  'P0001',
  null,
  'Không sửa được dòng đếm của phiên đã duyệt (khóa phiên)'
);

select throws_ok(
  $$ select public.approve_stocktake((select id from test_ids where label = 'stocktake1')) $$,
  null,
  null,
  'Không duyệt lại được phiên đã duyệt'
);

-- Phiên thứ hai: còn sản phẩm chưa đếm thì không được duyệt.
select public.create_stocktake(
  (select id from public.warehouses where code = 'KHO01'),
  current_date,
  array[(select id from test_ids where label = 'product'), (select id from test_ids where label = 'product2')]
);

insert into test_ids values ('stocktake2', (select id from public.stocktakes where status = 'counting' order by created_at desc limit 1));

update public.stocktake_lines
  set counted_qty = system_qty
  where stocktake_id = (select id from test_ids where label = 'stocktake2')
    and product_id = (select id from test_ids where label = 'product');

select throws_ok(
  $$ select public.approve_stocktake((select id from test_ids where label = 'stocktake2')) $$,
  null,
  null,
  'Còn sản phẩm chưa đếm (product2) thì không duyệt được phiên kiểm kho'
);

-- ---------------------------------------------------------------------------
-- 4) Báo cáo xuất nhập tồn: tồn đầu + nhập - xuất = tồn cuối (số lượng và giá trị).
-- ---------------------------------------------------------------------------
select is(
  (select begin_qty from public.inventory_flow_report('2026-01-10', '2026-01-12',
      (select id from public.warehouses where code = 'KHO01'), null)
    where product_id = (select id from test_ids where label = 'product')),
  0::numeric,
  'Báo cáo XNT 10-12/01: tồn đầu (trước 10/01) = 0'
);

select is(
  (select in_qty from public.inventory_flow_report('2026-01-10', '2026-01-12',
      (select id from public.warehouses where code = 'KHO01'), null)
    where product_id = (select id from test_ids where label = 'product')),
  120::numeric,
  'Báo cáo XNT 10-12/01: nhập = 20 + 100 = 120'
);

select is(
  (select out_qty from public.inventory_flow_report('2026-01-10', '2026-01-12',
      (select id from public.warehouses where code = 'KHO01'), null)
    where product_id = (select id from test_ids where label = 'product')),
  5::numeric,
  'Báo cáo XNT 10-12/01: xuất = 5'
);

select is(
  (select end_qty from public.inventory_flow_report('2026-01-10', '2026-01-12',
      (select id from public.warehouses where code = 'KHO01'), null)
    where product_id = (select id from test_ids where label = 'product')),
  115::numeric,
  'Báo cáo XNT 10-12/01: tồn cuối = 0 + 120 - 5 = 115'
);

select is(
  (select end_value from public.inventory_flow_report('2026-01-10', '2026-01-12',
      (select id from public.warehouses where code = 'KHO01'), null)
    where product_id = (select id from test_ids where label = 'product')),
  (select begin_value + in_value - out_value from public.inventory_flow_report('2026-01-10', '2026-01-12',
      (select id from public.warehouses where code = 'KHO01'), null)
    where product_id = (select id from test_ids where label = 'product')),
  'Báo cáo XNT 10-12/01: tồn cuối (giá trị) = tồn đầu + nhập - xuất (giá trị)'
);

select * from finish();
rollback;
