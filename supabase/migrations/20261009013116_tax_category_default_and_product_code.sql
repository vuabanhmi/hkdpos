-- Bổ sung theo yêu cầu: (1) nhóm ngành nghề tính thuế có thể đặt mặc định, tự
-- chọn sẵn khi tạo sản phẩm mới; (2) bỏ trống mã sản phẩm thì hệ thống tự sinh
-- mã dạng SP00X.

-- ---------------------------------------------------------------------------
-- tax_categories.is_default: chỉ một nhóm được là mặc định, cùng cơ chế với
-- price_lists/warehouses ở các bước trước.
-- ---------------------------------------------------------------------------
alter table public.tax_categories add column is_default boolean not null default false;

create or replace function public.trg_tax_categories_single_default()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.tax_categories
      set is_default = false
      where id <> new.id and is_default = true;
  end if;
  return new;
end;
$$;

create trigger tax_categories_single_default
  before insert or update on public.tax_categories
  for each row
  when (new.is_default)
  execute function public.trg_tax_categories_single_default();

create unique index tax_categories_one_default on public.tax_categories (is_default) where is_default = true;

-- Nếu hộ hiện chỉ có đúng một nhóm ngành nghề tính thuế, đặt luôn làm mặc định
-- (hầu hết trường hợp hộ kinh doanh một ngành nghề duy nhất).
update public.tax_categories set is_default = true
where (select count(*) from public.tax_categories) = 1;

-- ---------------------------------------------------------------------------
-- Sinh mã sản phẩm tự động khi người dùng để trống: SP001, SP002, ...
-- Lấy số lớn nhất trong các mã có đúng dạng SP<số> rồi +1, không dựa vào count(*)
-- để tránh trùng nếu có mã SP... được đặt tay không theo thứ tự.
-- ---------------------------------------------------------------------------
create or replace function public.generate_product_code()
returns text
language plpgsql
as $$
declare
  v_next int;
begin
  select coalesce(max((regexp_match(code, '^SP(\d+)$'))[1]::int), 0) + 1 into v_next
  from public.products
  where code ~ '^SP\d+$';

  return 'SP' || lpad(v_next::text, 3, '0');
end;
$$;

grant execute on function public.generate_product_code() to authenticated;
