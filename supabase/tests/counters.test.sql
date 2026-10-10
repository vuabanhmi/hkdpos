-- pgTAP test cho Bước 1.3b: quầy bán hàng và thống kê theo quầy cuối ngày.
-- Chạy bằng: supabase test db

begin;
select plan(13);

create temp table test_ids (label text primary key, id uuid);
create temp table test_values (label text primary key, value bigint);

insert into public.units (id, name) values ('00000000-0000-0000-0000-000000000041', 'Đơn vị test quầy');

insert into public.product_groups (id, name) values
  ('00000000-0000-0000-0000-000000000042', 'Nhóm quầy A'),
  ('00000000-0000-0000-0000-000000000043', 'Nhóm quầy B');

insert into public.products (id, code, name, unit_id, group_id) values
  ('00000000-0000-0000-0000-000000000044', 'TESTCTR01', 'Sản phẩm quầy A', '00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000042'),
  ('00000000-0000-0000-0000-000000000045', 'TESTCTR02', 'Sản phẩm quầy B', '00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000043'),
  ('00000000-0000-0000-0000-000000000046', 'TESTCTR03', 'Sản phẩm chưa gán quầy', '00000000-0000-0000-0000-000000000041', null);

insert into public.counters (id, code, name) values
  ('00000000-0000-0000-0000-000000000047', 'QA', 'Quầy A'),
  ('00000000-0000-0000-0000-000000000048', 'QB', 'Quầy B');

insert into public.counter_product_groups (counter_id, product_group_id) values
  ('00000000-0000-0000-0000-000000000047', '00000000-0000-0000-0000-000000000042'),
  ('00000000-0000-0000-0000-000000000048', '00000000-0000-0000-0000-000000000043');

-- Không gán được một nhóm cho hai quầy.
select throws_ok(
  $$ insert into public.counter_product_groups (counter_id, product_group_id)
     values ('00000000-0000-0000-0000-000000000048', '00000000-0000-0000-0000-000000000042') $$,
  null, null,
  'Không gán được một nhóm sản phẩm cho hai quầy'
);

-- Nhập tồn cho cả 3 sản phẩm.
select public.post_stock_document(
  p_doc_type := 'purchase',
  p_warehouse_id := (select id from public.warehouses where code = 'KHO01'),
  p_note := 'Nhập tồn test quầy',
  p_lines := jsonb_build_array(
    jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000044', 'quantity', 100, 'unit_cost', 1000),
    jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000045', 'quantity', 100, 'unit_cost', 1000),
    jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000046', 'quantity', 100, 'unit_cost', 1000)
  )
);

-- Đơn 1: 2 x 10.000 (quầy A) + 3 x 5.000 (quầy B), giảm giá cả đơn 1.000.
insert into test_ids (label, id) select 'order1', (public.create_draft_order()).id;

select public.save_draft_order_items(
  (select id from test_ids where label = 'order1'), null, 1000, null,
  jsonb_build_array(
    jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000044', 'quantity', 2, 'unit_price', 10000, 'discount', 0),
    jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000045', 'quantity', 3, 'unit_price', 5000, 'discount', 0)
  )
);

select public.complete_order(
  (select id from test_ids where label = 'order1'),
  jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 34000))
);

select is(
  (select counter_id from public.order_items where order_id = (select id from test_ids where label = 'order1') and product_id = '00000000-0000-0000-0000-000000000044'),
  '00000000-0000-0000-0000-000000000047'::uuid,
  'Dòng hàng quầy A được gán đúng counter_id'
);

select is(
  (select gross_amount from public.order_items where order_id = (select id from test_ids where label = 'order1') and product_id = '00000000-0000-0000-0000-000000000045'),
  15000::bigint,
  'Doanh số gộp dòng quầy B = 3 x 5.000 = 15.000'
);

select is(
  (select sum(allocated_order_discount)::bigint from public.order_items where order_id = (select id from test_ids where label = 'order1')),
  1000::bigint,
  'Tổng giảm giá cả đơn phân bổ về các dòng khớp đúng discount_total (1.000), không lệch một đồng'
);

select is(
  (select sum(net_amount)::bigint from public.order_items where order_id = (select id from test_ids where label = 'order1')),
  (select total from public.orders where id = (select id from test_ids where label = 'order1')),
  'Tổng net_amount các dòng bằng đúng tổng doanh thu đơn (total)'
);

-- Đổi gán nhóm A sang quầy B sau khi đã bán -> số liệu dòng cũ không đổi.
update public.counter_product_groups set counter_id = '00000000-0000-0000-0000-000000000048'
where product_group_id = '00000000-0000-0000-0000-000000000042';

select is(
  (select counter_id from public.order_items where order_id = (select id from test_ids where label = 'order1') and product_id = '00000000-0000-0000-0000-000000000044'),
  '00000000-0000-0000-0000-000000000047'::uuid,
  'Đổi gán nhóm sang quầy khác không làm thay đổi counter_id đã lưu ở dòng hàng cũ'
);

-- trả lại gán cũ để không ảnh hưởng các test sau
update public.counter_product_groups set counter_id = '00000000-0000-0000-0000-000000000047'
where product_group_id = '00000000-0000-0000-0000-000000000042';

-- Đơn 2: sản phẩm chưa gán quầy.
insert into test_ids (label, id) select 'order2', (public.create_draft_order()).id;
select public.save_draft_order_items(
  (select id from test_ids where label = 'order2'), null, 0, null,
  jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000046', 'quantity', 1, 'unit_price', 7000, 'discount', 0))
);
select public.complete_order((select id from test_ids where label = 'order2'), jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 7000)));

select is(
  (select counter_name_snapshot from public.order_items where order_id = (select id from test_ids where label = 'order2')),
  'Chưa gán quầy',
  'Sản phẩm chưa gán quầy ghi nhãn "Chưa gán quầy"'
);

-- Đối chiếu báo cáo theo quầy với tổng doanh thu cuối ngày (đơn 1 + đơn 2), kể cả dòng "Chưa gán quầy".
-- Dùng ngày hiện tại THEO GIỜ VIỆT NAM (không phải current_date — đó là ngày theo
-- múi giờ server, thường là UTC, lệch với VN khi chạy test gần nửa đêm UTC).
select is(
  (select sum(net_amount)::bigint from public.counter_daily_report(
     (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date,
     (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date
   )
   where report_date = (select (completed_at at time zone 'Asia/Ho_Chi_Minh')::date from public.orders where id = (select id from test_ids where label = 'order1'))),
  (select sum(total)::bigint from public.orders where id in ((select id from test_ids where label = 'order1'), (select id from test_ids where label = 'order2')) and status = 'completed'),
  'Tổng net_amount theo báo cáo quầy (kể cả Chưa gán quầy) khớp đúng tổng doanh thu cuối ngày'
);

-- Trả hàng một phần đơn 1 (quầy A) -> trả đúng quầy gốc, số âm.
insert into test_ids (label, id)
select 'return1', (
  public.create_return(
    (select id from test_ids where label = 'order1'),
    jsonb_build_array(jsonb_build_object(
      'order_item_id', (select id from public.order_items where order_id = (select id from test_ids where label = 'order1') and product_id = '00000000-0000-0000-0000-000000000044'),
      'quantity', 1
    )),
    'Khách trả test quầy'
  )
).id;

select is(
  (select counter_id from public.order_return_items where order_return_id = (select id from test_ids where label = 'return1')),
  '00000000-0000-0000-0000-000000000047'::uuid,
  'Trả hàng ghi đúng quầy gốc của dòng hàng'
);

select ok(
  (select gross_amount < 0 and net_amount < 0 from public.order_return_items where order_return_id = (select id from test_ids where label = 'return1')),
  'Trả hàng ghi gross_amount và net_amount là số âm'
);

-- Đơn hủy không xuất hiện trong báo cáo: chốt tổng TRƯỚC khi tạo đơn 3, rồi tạo
-- + hoàn tất + hủy ngay đơn 3 -> tổng báo cáo phải quay lại đúng như trước đó.
insert into test_values (label, value)
select 'total_before_order3', sum(net_amount) from public.counter_daily_report(
  (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date,
  (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date
);

insert into test_ids (label, id) select 'order3', (public.create_draft_order()).id;
select public.save_draft_order_items(
  (select id from test_ids where label = 'order3'), null, 0, null,
  jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000044', 'quantity', 1, 'unit_price', 9000, 'discount', 0))
);
select public.complete_order((select id from test_ids where label = 'order3'), jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 9000)));
select public.cancel_order((select id from test_ids where label = 'order3'), 'Hủy test quầy');

select is(
  (select sum(net_amount)::bigint from public.counter_daily_report(
     (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date,
     (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date
   )),
  (select value from test_values where label = 'total_before_order3'),
  'Đơn tạo rồi hủy ngay không làm thay đổi tổng net_amount trong báo cáo theo quầy (đơn hủy không tính)'
);

-- Đơn lúc 23:59 và 00:01 giờ Việt Nam rơi vào đúng ngày.
insert into test_ids (label, id) select 'order_late_night', (public.create_draft_order()).id;
select public.save_draft_order_items(
  (select id from test_ids where label = 'order_late_night'), null, 0, null,
  jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000044', 'quantity', 1, 'unit_price', 1000, 'discount', 0))
);
select public.complete_order((select id from test_ids where label = 'order_late_night'), jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 1000)));
-- 23:59:00 giờ VN ngày 2026-03-15 -> 16:59:00 UTC cùng ngày.
update public.orders set completed_at = '2026-03-15 16:59:00+00'
where id = (select id from test_ids where label = 'order_late_night');

select is(
  (select report_date from public.counter_daily_report('2026-03-15', '2026-03-15')
   where counter_id = '00000000-0000-0000-0000-000000000047' limit 1),
  '2026-03-15'::date,
  'Đơn hoàn tất 23:59 giờ VN rơi vào đúng ngày 2026-03-15'
);

insert into test_ids (label, id) select 'order_early_morning', (public.create_draft_order()).id;
select public.save_draft_order_items(
  (select id from test_ids where label = 'order_early_morning'), null, 0, null,
  jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000044', 'quantity', 1, 'unit_price', 1000, 'discount', 0))
);
select public.complete_order((select id from test_ids where label = 'order_early_morning'), jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 1000)));
-- 00:01:00 giờ VN ngày 2026-03-16 -> 17:01:00 UTC ngày 2026-03-15.
update public.orders set completed_at = '2026-03-15 17:01:00+00'
where id = (select id from test_ids where label = 'order_early_morning');

select is(
  (select report_date from public.counter_daily_report('2026-03-16', '2026-03-16')
   where counter_id = '00000000-0000-0000-0000-000000000047' limit 1),
  '2026-03-16'::date,
  'Đơn hoàn tất 00:01 giờ VN rơi vào đúng ngày 2026-03-16 (không phải ngày UTC)'
);

select * from finish();
rollback;
