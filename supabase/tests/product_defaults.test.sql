-- pgTAP test: sinh mã sản phẩm tự động và nhóm ngành nghề tính thuế mặc định.
-- Chạy bằng: supabase test db

begin;
select plan(4);

insert into public.units (id, name) values ('00000000-0000-0000-0000-000000000031', 'Đơn vị test mã');

select is(
  public.generate_product_code(),
  'SP001',
  'Chưa có sản phẩm mã SP... thì sinh SP001'
);

insert into public.products (id, code, name, unit_id)
values ('00000000-0000-0000-0000-000000000032', 'SP001', 'Sản phẩm test mã', '00000000-0000-0000-0000-000000000031');

select is(
  public.generate_product_code(),
  'SP002',
  'Đã có SP001 thì sinh tiếp SP002'
);

insert into public.tax_categories (id, name, code, is_default)
values ('00000000-0000-0000-0000-000000000033', 'Ngành test A', 'TAXA', true);
insert into public.tax_categories (id, name, code, is_default)
values ('00000000-0000-0000-0000-000000000034', 'Ngành test B', 'TAXB', true);

select is(
  (select count(*) from public.tax_categories where is_default = true)::int,
  1,
  'Chỉ có đúng một nhóm ngành nghề tính thuế mặc định'
);

select is(
  (select name from public.tax_categories where is_default = true),
  'Ngành test B',
  'Đặt mặc định nhóm mới nhất thì nhóm cũ tự bỏ mặc định'
);

select * from finish();
rollback;
