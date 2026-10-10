-- Mã nhóm ngành nghề tính thuế (tax_categories.code) không còn bắt buộc nhập
-- tay: bỏ trống thì tự sinh theo cùng cơ chế generate_product_code() (Bước 1.1) —
-- dạng NN001, NN002... Lý do: form nhập liệu nhanh (QuickAdd) trước đó không
-- buộc nhập mã, nhưng server lại từ chối khi mã trống, khiến người dùng tạo
-- không thành công mà không rõ vì sao (đã đổi hướng: thay vì bắt buộc, cho tự sinh).
create or replace function public.generate_tax_category_code()
returns text
language plpgsql
as $$
declare
  v_next int;
begin
  select coalesce(max((regexp_match(code, '^NN(\d+)$'))[1]::int), 0) + 1 into v_next
  from public.tax_categories
  where code ~ '^NN\d+$';

  return 'NN' || lpad(v_next::text, 3, '0');
end;
$$;

grant execute on function public.generate_tax_category_code() to authenticated;
