-- Bước 0: bảng app_users và hàm is_app_user() dùng chung cho RLS của các bảng nghiệp vụ sau này.
-- Dự án dùng cho một hộ kinh doanh: không có đăng ký công khai, tài khoản được tạo thủ công
-- (insert vào auth.users rồi insert dòng app_users tương ứng cùng id).

create table if not exists public.app_users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

comment on table public.app_users is
  'Danh sách người dùng được phép truy cập dữ liệu nghiệp vụ. Tài khoản tạo thủ công, không tự đăng ký.';

-- SECURITY DEFINER để hàm đọc được app_users mà không bị chặn bởi RLS của chính bảng này
-- (tránh đệ quy policy), do hàm chạy với quyền của người tạo (postgres), là owner của bảng.
create or replace function public.is_app_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.app_users where id = auth.uid()
  );
$$;

comment on function public.is_app_user() is
  'Trả về true nếu người dùng hiện tại (auth.uid()) có trong app_users. Dùng trong policy RLS của các bảng nghiệp vụ.';

alter table public.app_users enable row level security;

-- Mọi app_user (owner hoặc staff) xem được danh sách người dùng (tên hiển thị, vai trò).
create policy "app_users_select_app_user"
  on public.app_users
  for select
  to authenticated
  using (public.is_app_user());

-- Không có policy insert/update/delete cho role authenticated: thêm/sửa tài khoản thực hiện
-- thủ công qua Supabase Studio hoặc service role, theo đúng quy tắc "tài khoản tạo thủ công".
