-- pgTAP test cho Bước 1.6: sổ doanh thu S2a-HKD, tax_rules, khóa kỳ kê khai.
-- Chạy bằng: supabase test db

begin;
select plan(14);

create temp table test_ids (label text primary key, id uuid);

insert into public.units (id, name) values ('00000000-0000-0000-0000-000000000061', 'Đơn vị test sổ DT');

-- Tax category riêng cho test (độc lập với "Dịch vụ ăn uống" đã seed), để không
-- phụ thuộc dữ liệu seed và tránh đụng tax_category mặc định.
insert into test_ids (label, id) values ('tc', gen_random_uuid());
insert into public.tax_categories (id, name, code) values
  ((select id from test_ids where label = 'tc'), 'Ngành test sổ DT', 'TESTDT01');
insert into public.tax_rules (key, value, effective_from, source_note) values (
  'tax_category_rate:' || (select id from test_ids where label = 'tc')::text,
  '{"gtgt_rate": 0.05, "tncn_rate": 0.02}'::jsonb,
  '2020-01-01',
  'Test'
);

insert into public.products (id, code, name, unit_id, tax_category_id) values
  ('00000000-0000-0000-0000-000000000062', 'TESTDT01', 'Sản phẩm test sổ DT',
   '00000000-0000-0000-0000-000000000061', (select id from test_ids where label = 'tc'));

select public.post_stock_document(
  p_doc_type := 'purchase',
  p_warehouse_id := (select id from public.warehouses where code = 'KHO01'),
  p_note := 'Nhập tồn test sổ DT',
  p_lines := jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-000000000062', 'quantity', 100, 'unit_cost', 1000
  ))
);

-- ---------------------------------------------------------------------------
-- 1) get_tax_rule_value: lấy đúng tỷ lệ theo ngành nghề đã seed cho test.
-- ---------------------------------------------------------------------------
select is(
  (public.get_tax_rule_value('tax_category_rate:' || (select id from test_ids where label = 'tc')::text, current_date) ->> 'gtgt_rate')::numeric,
  0.05,
  'get_tax_rule_value trả đúng tỷ lệ GTGT đã seed cho nhóm ngành nghề test'
);

-- ---------------------------------------------------------------------------
-- 2) Đơn hoàn thành -> xuất hiện trong revenue_ledger_lines, doanh thu = tổng
--    net_amount đúng theo nhóm ngành nghề.
-- ---------------------------------------------------------------------------
insert into test_ids (label, id) select 'order1', (public.create_draft_order()).id;
select public.save_draft_order_items(
  (select id from test_ids where label = 'order1'), null, 0, null,
  jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-000000000062', 'quantity', 10, 'unit_price', 20000, 'discount', 0
  ))
);
select public.complete_order(
  (select id from test_ids where label = 'order1'),
  jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 200000))
);

select is(
  (select sum(amount)::bigint from public.revenue_ledger_lines
    where tax_category_id = (select id from test_ids where label = 'tc')),
  200000::bigint,
  'Đơn hoàn thành xuất hiện trong revenue_ledger_lines với doanh thu đúng'
);

-- ---------------------------------------------------------------------------
-- 3) Doanh thu nhập tay: tạo, xuất hiện đúng trong revenue_ledger_lines.
-- ---------------------------------------------------------------------------
insert into test_ids (label, id)
select 'manual1', (
  public.create_manual_revenue_entry(
    current_date, 'Bán hàng không qua POS', 50000, 'cash',
    (select id from test_ids where label = 'tc')
  )
).id;

select is(
  (select sum(amount)::bigint from public.revenue_ledger_lines
    where tax_category_id = (select id from test_ids where label = 'tc')),
  250000::bigint,
  'Doanh thu nhập tay cộng đúng vào revenue_ledger_lines (200.000 + 50.000)'
);

-- ---------------------------------------------------------------------------
-- 4) Đảo doanh thu nhập tay: triệt tiêu đúng, không sửa/xóa được dòng gốc.
-- ---------------------------------------------------------------------------
select public.create_manual_revenue_entry_reversal((select id from test_ids where label = 'manual1'), 'Nhập sai');

select is(
  (select sum(amount)::bigint from public.manual_revenue_entries
    where id = (select id from test_ids where label = 'manual1')
       or reversed_of = (select id from test_ids where label = 'manual1')),
  0::bigint,
  'Phiếu đảo doanh thu nhập tay triệt tiêu đúng phiếu gốc'
);

select throws_ok(
  $$ update public.manual_revenue_entries set amount = 1
       where id = (select id from test_ids where label = 'manual1') $$,
  'P0001',
  null,
  'Không sửa được manual_revenue_entries (append-only)'
);

-- ---------------------------------------------------------------------------
-- 5) revenue_by_tax_category: doanh thu + thuế tạm tính đúng (200.000 doanh thu
--    còn lại sau khi đảo khoản nhập tay; GTGT 5% = 10.000, TNCN 2% = 4.000).
-- ---------------------------------------------------------------------------
select is(
  (select revenue from public.revenue_by_tax_category(current_date - 1, current_date + 1)
    where tax_category_id = (select id from test_ids where label = 'tc')),
  200000::bigint,
  'revenue_by_tax_category: doanh thu đúng sau khi đảo khoản nhập tay'
);

select is(
  (select gtgt_amount from public.revenue_by_tax_category(current_date - 1, current_date + 1)
    where tax_category_id = (select id from test_ids where label = 'tc')),
  10000::bigint,
  'revenue_by_tax_category: thuế GTGT tạm tính = 200.000 x 5% = 10.000'
);

select is(
  (select tncn_amount from public.revenue_by_tax_category(current_date - 1, current_date + 1)
    where tax_category_id = (select id from test_ids where label = 'tc')),
  4000::bigint,
  'revenue_by_tax_category: thuế TNCN tạm tính = 200.000 x 2% = 4.000'
);

-- ---------------------------------------------------------------------------
-- 6) Đổi tỷ lệ thuế có hiệu lực theo ngày: kỳ cũ dùng tỷ lệ cũ, kỳ mới dùng tỷ
--    lệ mới.
-- ---------------------------------------------------------------------------
insert into public.tax_rules (key, value, effective_from, source_note) values (
  'tax_category_rate:' || (select id from test_ids where label = 'tc')::text,
  '{"gtgt_rate": 0.08, "tncn_rate": 0.03}'::jsonb,
  current_date + 10,
  'Test đổi tỷ lệ'
);

select is(
  (public.get_tax_rule_value('tax_category_rate:' || (select id from test_ids where label = 'tc')::text, current_date) ->> 'gtgt_rate')::numeric,
  0.05,
  'Kỳ hiện tại (trước ngày hiệu lực mới) vẫn dùng tỷ lệ cũ 5%'
);

select is(
  (public.get_tax_rule_value('tax_category_rate:' || (select id from test_ids where label = 'tc')::text, current_date + 10) ->> 'gtgt_rate')::numeric,
  0.08,
  'Từ ngày hiệu lực mới trở đi dùng tỷ lệ mới 8%'
);

-- ---------------------------------------------------------------------------
-- 7) Đơn hủy không tính vào doanh thu.
-- ---------------------------------------------------------------------------
insert into test_ids (label, id) select 'order2', (public.create_draft_order()).id;
select public.save_draft_order_items(
  (select id from test_ids where label = 'order2'), null, 0, null,
  jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-000000000062', 'quantity', 1, 'unit_price', 9000, 'discount', 0
  ))
);
select public.complete_order((select id from test_ids where label = 'order2'), jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 9000)));
select public.cancel_order((select id from test_ids where label = 'order2'), 'Hủy test sổ DT');

select is(
  (select sum(amount)::bigint from public.revenue_ledger_lines
    where tax_category_id = (select id from test_ids where label = 'tc')),
  200000::bigint,
  'Đơn tạo rồi hủy ngay không làm thay đổi doanh thu trong revenue_ledger_lines'
);

-- ---------------------------------------------------------------------------
-- 8) Khóa kỳ: chặn tạo dữ liệu mới có ngày trong kỳ đã khóa.
-- Tạo sẵn đơn nháp (order3) TRƯỚC khi khóa kỳ — tạo/sửa đơn nháp chưa ảnh hưởng
-- doanh thu nên không bị chặn; chỉ complete_order (ghi nhận doanh thu) mới bị
-- chặn sau khi khóa.
-- ---------------------------------------------------------------------------
insert into test_ids (label, id) select 'order3', (public.create_draft_order()).id;
select public.save_draft_order_items(
  (select id from test_ids where label = 'order3'), null, 0, null,
  jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-000000000062', 'quantity', 1, 'unit_price', 9000, 'discount', 0
  ))
);

select public.lock_period('quarter', current_date - 5, current_date + 5, 'Khóa test');

select throws_ok(
  $$ select public.create_manual_revenue_entry(
       current_date, 'Thử ghi khi đã khóa kỳ', 1000, 'cash',
       (select id from test_ids where label = 'tc')
     ) $$,
  null, null,
  'Kỳ đã khóa chặn tạo doanh thu nhập tay mới có ngày trong kỳ'
);

select throws_ok(
  $$ select public.complete_order(
       (select id from test_ids where label = 'order3'),
       jsonb_build_array(jsonb_build_object('method', 'cash', 'amount', 9000))
     ) $$,
  null, null,
  'Kỳ đã khóa chặn hoàn tất đơn hàng có ngày trong kỳ'
);

-- Mở khóa rồi thử lại phải thành công.
select public.unlock_period(
  (select id from public.ledger_periods where period_type = 'quarter' and period_start = current_date - 5),
  'Mở khóa lại để tiếp tục test'
);

select lives_ok(
  $$ select public.create_manual_revenue_entry(
       current_date, 'Ghi sau khi mở khóa', 1000, 'cash',
       (select id from test_ids where label = 'tc')
     ) $$,
  'Mở khóa kỳ xong thì ghi dữ liệu mới lại được'
);

select * from finish();
rollback;
