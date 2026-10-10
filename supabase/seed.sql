-- Dữ liệu seed cho Supabase local (chạy khi `supabase db reset`).
-- Tạo sẵn một tài khoản chủ hộ (owner) để đăng nhập thử trên máy phát triển.
-- KHÔNG dùng cho production: đổi mật khẩu hoặc xóa trước khi lên môi trường thật.
--
-- Đăng nhập thử: email = owner@hkd.local, mật khẩu = Owner@123

create extension if not exists pgcrypto;

do $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'owner@hkd.local',
    crypt('Owner@123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'owner@hkd.local'),
    'email',
    now(), now()
  );

  insert into public.app_users (id, display_name, role)
  values (v_user_id, 'Chủ hộ', 'owner');
end $$;
