-- pgTAP test cho Bước 1.4: thu chi.
-- Chạy bằng: supabase test db

begin;
select plan(11);

create temp table test_ids (label text primary key, id uuid);

-- 1-2. Tạo phiếu thu 500.000 và phiếu chi 200.000.
insert into test_ids (label, id)
select 'income1', (
  public.create_cash_entry(
    'income', (select id from public.cash_categories where name = 'Thu khác'),
    500000, 'cash', clock_timestamp(), 'Thu test'
  )
).id;

insert into test_ids (label, id)
select 'expense1', (
  public.create_cash_entry(
    'expense', (select id from public.cash_categories where name = 'Điện nước'),
    200000, 'cash', clock_timestamp(), 'Chi test'
  )
).id;

select is(
  (select sum(amount)::bigint from public.cash_entries where kind = 'income'),
  500000::bigint,
  'Tổng thu đúng = 500.000'
);

select is(
  (select sum(amount)::bigint from public.cash_entries where kind = 'expense'),
  200000::bigint,
  'Tổng chi đúng = 200.000'
);

-- 3. Danh mục không khớp loại phiếu phải bị chặn.
select throws_ok(
  $$ select public.create_cash_entry(
       'income', (select id from public.cash_categories where name = 'Điện nước'),
       100000, 'cash', clock_timestamp(), null
     ) $$,
  null, null,
  'Danh mục chi không dùng được cho phiếu thu'
);

-- 4. Tạo phiếu đảo cho phiếu chi -> triệt tiêu đúng phiếu gốc.
insert into test_ids (label, id)
select 'expense1_reversal', (
  public.create_cash_entry_reversal((select id from test_ids where label = 'expense1'), 'Ghi nhầm số tiền')
).id;

select is(
  (select amount from public.cash_entries where id = (select id from test_ids where label = 'expense1_reversal')),
  -200000::bigint,
  'Phiếu đảo có amount âm đúng bằng -phiếu gốc'
);

select is(
  (select sum(amount)::bigint from public.cash_entries where kind = 'expense'),
  0::bigint,
  'Phiếu đảo triệt tiêu đúng phiếu gốc trong tổng chi (200.000 - 200.000 = 0)'
);

-- 5. Không đảo được phiếu đã có phiếu đảo.
select throws_ok(
  $$ select public.create_cash_entry_reversal(
       (select id from test_ids where label = 'expense1'), 'Đảo lần 2'
     ) $$,
  null, null,
  'Không tạo được phiếu đảo thứ hai cho cùng một phiếu gốc'
);

-- 6. Không đảo được chính một phiếu đảo.
select throws_ok(
  $$ select public.create_cash_entry_reversal(
       (select id from test_ids where label = 'expense1_reversal'), 'Đảo của đảo'
     ) $$,
  null, null,
  'Không tạo được phiếu đảo cho một phiếu đảo khác'
);

-- 7-8. Không sửa, không xóa được cash_entries.
select throws_ok(
  $$ update public.cash_entries set amount = 1 where id = (select id from test_ids where label = 'income1') $$,
  'P0001', null,
  'UPDATE cash_entries bị chặn bởi trigger'
);

select throws_ok(
  $$ delete from public.cash_entries where id = (select id from test_ids where label = 'income1') $$,
  'P0001', null,
  'DELETE cash_entries bị chặn bởi trigger'
);

-- 9-10. cash_ledger gộp đúng tiền bán hàng (payments) và phiếu thu/chi thủ công.
insert into public.units (id, name) values ('00000000-0000-0000-0000-000000000051', 'Đơn vị test thu chi');
insert into public.products (id, code, name, unit_id)
values ('00000000-0000-0000-0000-000000000052', 'TESTCASH01', 'Sản phẩm test thu chi', '00000000-0000-0000-0000-000000000051');
select public.post_stock_document(
  p_doc_type := 'purchase',
  p_warehouse_id := (select id from public.warehouses where code = 'KHO01'),
  p_note := 'Nhập tồn test thu chi',
  p_lines := jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000052', 'quantity', 5, 'unit_cost', 1000))
);
insert into test_ids (label, id) select 'order1', (public.create_draft_order()).id;
select public.save_draft_order_items(
  (select id from test_ids where label = 'order1'), null, 0, null,
  jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000052', 'quantity', 1, 'unit_price', 30000, 'discount', 0))
);
select public.complete_order(
  (select id from test_ids where label = 'order1'),
  jsonb_build_array(jsonb_build_object('method', 'transfer', 'amount', 30000))
);

select is(
  (select amount from public.cash_ledger where source = 'order_payment' and source_id in (select id from public.payments where order_id = (select id from test_ids where label = 'order1'))),
  30000::bigint,
  'cash_ledger có đúng dòng tiền bán hàng từ payments (không cần nhập lại phiếu thu)'
);

select is(
  (select sum(amount)::bigint from public.cash_ledger where kind = 'income'),
  500000::bigint + 30000::bigint,
  'Tổng thu trong cash_ledger gồm cả phiếu thu thủ công và tiền bán hàng'
);

select * from finish();
rollback;
