-- Thêm is_active cho units để quản lý danh mục (ẩn/khôi phục đơn vị) theo cùng
-- cơ chế xóa mềm đã dùng cho product_groups và tax_categories, phục vụ trang
-- quản lý danh mục (nhóm sản phẩm / đơn vị tính / nhóm ngành nghề tính thuế).
alter table public.units add column is_active boolean not null default true;
