-- pgTAP test cho Bước 1.3: tính tiền, trừ kho, hủy đơn, trả hàng.
-- Chạy bằng: supabase test db

begin;
select plan(13);

create temp table test_ids (label text primary key, id uuid);

insert into public.units (id, name) values ('00000000-0000-0000-0000-000000000021', 'Đơn vị test đơn hàng');
insert into public.products (id, code, name, unit_id)
values ('00000000-0000-0000-0000-000000000022', 'TESTORD01', 'Sản phẩm test đơn hàng', '00000000-0000-0000-0000-000000000021');

-- Nhập sẵn 30 cái giá vốn 1.000 để có tồn mà bán.
select public.post_stock_document(
  p_doc_type := 'purchase',
  p_warehouse_id := (select id from public.warehouses where code = 'KHO01'),
  p_note := 'Nhập tồn test',
  p_lines := jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-000000000022', 'quantity', 30, 'unit_cost', 1000
  ))
);

-- ---------------------------------------------------------------------------
-- Đơn 1: 2 x 15.000 - giảm dòng 1.000 = 29.000; giảm thêm cả đơn 2.000 -> 27.000.
-- ---------------------------------------------------------------------------
insert into test_ids (label, id) select 'order1', (public.create_draft_order()).id;

select public.save_draft_order_items(
  (select id from test_ids where label = 'order1'),
  null,
  2000,
  'Đơn test 1',
  jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-000000000022', 'quantity', 2, 'unit_price', 15000, 'discount', 1000
  ))
);

select is(
  (select subtotal from public.orders where id = (select id from test_ids where label = 'order1')),
  29000::bigint,
  'Tính đúng subtotal (2 x 15.000 - giảm dòng 1.000 = 29.000)'
);

select is(
  (select total from public.orders where id = (select id from test_ids where label = 'order1')),
  27000::bigint,
  'Tính đúng total sau giảm giá cả đơn (29.000 - 2.000 = 27.000)'
);

select public.complete_order(
  (select id from test_ids where label = 'order1'),
  jsonb_build_array(
    jsonb_build_object('method', 'cash', 'amount', 20000),
    jsonb_build_object('method', 'transfer', 'amount', 7000)
  )
);

select is(
  (select status from public.orders where id = (select id from test_ids where label = 'order1')),
  'completed',
  'Hoàn tất đơn chuyển trạng thái completed'
);

select is(
  (select paid_total from public.orders where id = (select id from test_ids where label = 'order1')),
  27000::bigint,
  'paid_total = tổng các khoản thanh toán (20.000 + 7.000)'
);

select is(
  (select debt_total from public.orders where id = (select id from test_ids where label = 'order1')),
  0::bigint,
  'debt_total = 0 vì đã trả đủ'
);

select is(
  public.stock_on_hand(
    (select id from public.warehouses where code = 'KHO01'),
    '00000000-0000-0000-0000-000000000022'
  ),
  28::numeric,
  'Hoàn tất đơn trừ đúng tồn (30 - 2 = 28)'
);

select is(
  (select unit_cost_snapshot from public.order_items
   where order_id = (select id from test_ids where label = 'order1')),
  1000::bigint,
  'order_items ghi đúng giá vốn tại thời điểm bán'
);

-- Hủy đơn đã hoàn tất -> tồn về đúng như cũ (30).
select public.cancel_order((select id from test_ids where label = 'order1'), 'Hủy test');

select is(
  (select status from public.orders where id = (select id from test_ids where label = 'order1')),
  'cancelled',
  'Hủy đơn chuyển trạng thái cancelled'
);

select is(
  public.stock_on_hand(
    (select id from public.warehouses where code = 'KHO01'),
    '00000000-0000-0000-0000-000000000022'
  ),
  30::numeric,
  'Hủy đơn đưa tồn về đúng như trước khi bán (28 + 2 = 30)'
);

-- ---------------------------------------------------------------------------
-- Đơn 2: bán vượt tồn (100 > 30) khi allow_negative_stock = false -> bị chặn.
-- ---------------------------------------------------------------------------
insert into test_ids (label, id) select 'order2', (public.create_draft_order()).id;

select public.save_draft_order_items(
  (select id from test_ids where label = 'order2'),
  null, 0, null,
  jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-000000000022', 'quantity', 100, 'unit_price', 10000, 'discount', 0
  ))
);

select throws_ok(
  $$ select public.complete_order(
       (select id from test_ids where label = 'order2'), '[]'::jsonb
     ) $$,
  null,
  null,
  'Không hoàn tất được đơn khi tồn không đủ'
);

-- ---------------------------------------------------------------------------
-- Đơn 3: bán 5 x 10.000 = 50.000, trả một phần 2 cái.
-- ---------------------------------------------------------------------------
insert into test_ids (label, id) select 'order3', (public.create_draft_order()).id;

select public.save_draft_order_items(
  (select id from test_ids where label = 'order3'),
  null, 0, null,
  jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-000000000022', 'quantity', 5, 'unit_price', 10000, 'discount', 0
  ))
);

select public.complete_order(
  (select id from test_ids where label = 'order3'),
  jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 50000))
);

insert into test_ids (label, id)
select 'return1', (
  public.create_return(
    (select id from test_ids where label = 'order3'),
    jsonb_build_array(jsonb_build_object(
      'order_item_id', (select id from public.order_items where order_id = (select id from test_ids where label = 'order3')),
      'quantity', 2
    )),
    'Khách trả 2 cái'
  )
).id;

select is(
  (select amount from public.order_return_items where order_return_id = (select id from test_ids where label = 'return1')),
  20000::bigint,
  'Trả hàng một phần tính đúng tiền (2/5 x 50.000 = 20.000)'
);

select is(
  public.stock_on_hand(
    (select id from public.warehouses where code = 'KHO01'),
    '00000000-0000-0000-0000-000000000022'
  ),
  27::numeric,
  'Trả hàng cộng đúng lại tồn (30 - 5 + 2 = 27)'
);

-- Trả thêm 4 cái nữa (vượt quá số còn lại là 3) phải bị chặn.
select throws_ok(
  $$ select public.create_return(
       (select id from test_ids where label = 'order3'),
       jsonb_build_array(jsonb_build_object(
         'order_item_id', (select id from public.order_items where order_id = (select id from test_ids where label = 'order3')),
         'quantity', 4
       )),
       'Trả vượt quá'
     ) $$,
  null,
  null,
  'Không trả được vượt quá số lượng còn có thể trả'
);

select * from finish();
rollback;
