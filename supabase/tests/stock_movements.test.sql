-- pgTAP test cho Bước 1.2: giá vốn bình quân, chặn tồn âm, hủy phiếu, append-only.
-- Chạy bằng: supabase test db

begin;
select plan(11);

insert into public.units (id, name) values ('00000000-0000-0000-0000-000000000011', 'Đơn vị test kho');
insert into public.products (id, code, name, unit_id)
values ('00000000-0000-0000-0000-000000000012', 'TESTKHO01', 'Sản phẩm test kho', '00000000-0000-0000-0000-000000000011');

-- Phiếu nhập 1: 10 x 1.000 -> giá vốn bình quân = 1.000 (chưa có tồn trước đó).
select public.post_stock_document(
  p_doc_type := 'purchase',
  p_warehouse_id := (select id from public.warehouses where code = 'KHO01'),
  p_note := 'Nhập lần 1',
  p_lines := jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-000000000012', 'quantity', 10, 'unit_cost', 1000
  ))
);

select is(
  (select cost_price from public.products where id = '00000000-0000-0000-0000-000000000012'),
  1000::bigint,
  'Nhập lần 1 (10 x 1.000): giá vốn bình quân = 1.000'
);

-- Phiếu nhập 2: 5 x 1.600 -> bình quân mới = (10*1000 + 5*1600) / 15 = 1.200.
select public.post_stock_document(
  p_doc_type := 'purchase',
  p_warehouse_id := (select id from public.warehouses where code = 'KHO01'),
  p_note := 'Nhập lần 2',
  p_lines := jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-000000000012', 'quantity', 5, 'unit_cost', 1600
  ))
);

select is(
  (select cost_price from public.products where id = '00000000-0000-0000-0000-000000000012'),
  1200::bigint,
  'Nhập lần 2 (5 x 1.600): giá vốn bình quân = 1.200'
);

select is(
  public.stock_on_hand(
    (select id from public.warehouses where code = 'KHO01'),
    '00000000-0000-0000-0000-000000000012'
  ),
  15::numeric,
  'Tồn sau 2 lần nhập = 15'
);

-- Phiếu xuất kho thủ công 3 cái -> không đổi giá vốn bình quân.
select public.post_stock_document(
  p_doc_type := 'issue',
  p_warehouse_id := (select id from public.warehouses where code = 'KHO01'),
  p_note := 'Xuất dùng nội bộ',
  p_lines := jsonb_build_array(jsonb_build_object(
    'product_id', '00000000-0000-0000-0000-000000000012', 'quantity', 3
  ))
);

select is(
  (select cost_price from public.products where id = '00000000-0000-0000-0000-000000000012'),
  1200::bigint,
  'Xuất kho thủ công không làm đổi giá vốn bình quân'
);

select is(
  public.stock_on_hand(
    (select id from public.warehouses where code = 'KHO01'),
    '00000000-0000-0000-0000-000000000012'
  ),
  12::numeric,
  'Tồn sau khi xuất 3 = 12'
);

-- Xuất vượt tồn (100 > 12) khi allow_negative_stock = false (mặc định) phải bị chặn.
select throws_ok(
  $$ select public.post_stock_document(
       p_doc_type := 'issue',
       p_warehouse_id := (select id from public.warehouses where code = 'KHO01'),
       p_note := 'Xuất vượt tồn',
       p_lines := jsonb_build_array(jsonb_build_object(
         'product_id', '00000000-0000-0000-0000-000000000012', 'quantity', 100
       ))
     ) $$,
  null,
  null,
  'Xuất vượt tồn bị chặn khi allow_negative_stock = false'
);

-- Hủy phiếu nhập lần 1 (10 x 1.000) -> tồn giảm về đúng 12 - 10 = 2, giá vốn giữ nguyên.
select public.void_stock_document(
  (select id from public.stock_documents where doc_no like 'PN%' order by created_at limit 1),
  'Hủy do nhập sai'
);

select is(
  public.stock_on_hand(
    (select id from public.warehouses where code = 'KHO01'),
    '00000000-0000-0000-0000-000000000012'
  ),
  2::numeric,
  'Hủy phiếu nhập lần 1 đưa tồn về đúng (12 - 10 = 2)'
);

select is(
  (select cost_price from public.products where id = '00000000-0000-0000-0000-000000000012'),
  1200::bigint,
  'Hủy phiếu không tính lại giá vốn bình quân lịch sử'
);

-- Hủy lại phiếu đã hủy phải báo lỗi.
select throws_ok(
  $$ select public.void_stock_document(
       (select id from public.stock_documents where doc_no like 'PN%' order by created_at limit 1),
       'Hủy lần 2'
     ) $$,
  null,
  null,
  'Không hủy được phiếu đã hủy trước đó'
);

-- Không sửa, không xóa được stock_movements.
select throws_ok(
  $$ update public.stock_movements set quantity = 1 where product_id = '00000000-0000-0000-0000-000000000012' $$,
  'P0001',
  null,
  'UPDATE stock_movements bị chặn bởi trigger'
);

select throws_ok(
  $$ delete from public.stock_movements where product_id = '00000000-0000-0000-0000-000000000012' $$,
  'P0001',
  null,
  'DELETE stock_movements bị chặn bởi trigger'
);

select * from finish();
rollback;
