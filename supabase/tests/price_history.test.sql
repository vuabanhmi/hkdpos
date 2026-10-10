-- pgTAP test cho Bước 1.1: trigger lịch sử giá và ràng buộc bảng giá mặc định.
-- Chạy bằng: supabase test db
-- (cần Supabase CLI + Docker; môi trường phát triển lúc viết file này không có sẵn hai thứ
-- đó nên các test dưới đây CHƯA được chạy thật — chạy thử trước khi tin tưởng kết quả.)

begin;
select plan(8);

-- Dữ liệu mẫu: một đơn vị tính và một sản phẩm để test, chạy với quyền postgres (bỏ qua RLS).
insert into public.units (id, name) values ('00000000-0000-0000-0000-000000000001', 'Đơn vị test');
insert into public.products (id, code, name, unit_id)
values ('00000000-0000-0000-0000-000000000002', 'TEST001', 'Sản phẩm test', '00000000-0000-0000-0000-000000000001');

-- 1. Bảng giá chung (seed trong migration) là bảng giá mặc định duy nhất.
select is(
  (select count(*) from public.price_lists where is_default = true)::int,
  1,
  'Chỉ có đúng một bảng giá mặc định sau khi seed'
);

-- 2. Thêm giá lần đầu -> sinh đúng một dòng price_history (old_price null).
select public.set_price_list_item_price(
  (select id from public.price_lists where is_default = true),
  '00000000-0000-0000-0000-000000000002',
  10000,
  'Giá khởi tạo'
);

select is(
  (select count(*) from public.price_history where product_id = '00000000-0000-0000-0000-000000000002')::int,
  1,
  'Thêm giá lần đầu sinh đúng một dòng lịch sử'
);

select is(
  (select old_price from public.price_history where product_id = '00000000-0000-0000-0000-000000000002' order by changed_at desc limit 1),
  null,
  'Dòng lịch sử đầu tiên có old_price = null'
);

-- 3. Lưu lại đúng giá cũ -> không sinh dòng mới.
select public.set_price_list_item_price(
  (select id from public.price_lists where is_default = true),
  '00000000-0000-0000-0000-000000000002',
  10000
);

select is(
  (select count(*) from public.price_history where product_id = '00000000-0000-0000-0000-000000000002')::int,
  1,
  'Lưu lại đúng giá cũ không sinh thêm dòng lịch sử'
);

-- 4. Đổi giá khác -> sinh thêm một dòng, đúng giá cũ/mới và lý do.
select public.set_price_list_item_price(
  (select id from public.price_lists where is_default = true),
  '00000000-0000-0000-0000-000000000002',
  12000,
  'Tăng giá nguyên liệu'
);

select is(
  (select count(*) from public.price_history where product_id = '00000000-0000-0000-0000-000000000002')::int,
  2,
  'Đổi sang giá khác sinh thêm một dòng lịch sử'
);

select results_eq(
  $$ select old_price, new_price, reason from public.price_history
     where product_id = '00000000-0000-0000-0000-000000000002'
     order by changed_at desc limit 1 $$,
  $$ values (10000::bigint, 12000::bigint, 'Tăng giá nguyên liệu'::text) $$,
  'Dòng lịch sử mới nhất có đúng giá cũ, giá mới và lý do'
);

-- 5. Không sửa, không xóa được price_history.
select throws_ok(
  $$ update public.price_history set new_price = 1 where product_id = '00000000-0000-0000-0000-000000000002' $$,
  'P0001',
  null,
  'UPDATE price_history bị chặn bởi trigger'
);

select throws_ok(
  $$ delete from public.price_history where product_id = '00000000-0000-0000-0000-000000000002' $$,
  'P0001',
  null,
  'DELETE price_history bị chặn bởi trigger'
);

select * from finish();
rollback;
