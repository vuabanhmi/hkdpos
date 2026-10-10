# App quản lý hộ kinh doanh

Xem `CLAUDE.md` (quy tắc bắt buộc) và `docs/hkd-app-roadmap.md` (kế hoạch từng bước).

## Yêu cầu

- Node.js 20+
- pnpm (dự án dùng `packageManager` trong `package.json`; nếu máy chưa có pnpm global, chạy
  qua `npx pnpm@latest <lệnh>`, hoặc `corepack use pnpm@latest`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — bắt buộc để chạy
  Supabase local (`supabase start` khởi động Postgres, Auth, Studio... trong container)
- Supabase CLI (có thể chạy qua `npx supabase <lệnh>`, không cần cài riêng)

## Cài đặt lần đầu

```bash
pnpm install

# Khởi động Supabase local (cần Docker đang chạy)
npx supabase start

# In ra URL, anon key, service role key của instance local
npx supabase status
```

Sao chép `.env.example` thành `.env.local`, điền `NEXT_PUBLIC_SUPABASE_URL` và
`NEXT_PUBLIC_SUPABASE_ANON_KEY` theo kết quả `supabase status` phía trên.

`supabase start` tự chạy migration trong `supabase/migrations/` và seed trong
`supabase/seed.sql`. Seed tạo sẵn một tài khoản chủ hộ để đăng nhập thử:

- Email: `owner@hkd.local`
- Mật khẩu: `Owner@123`

Chạy app:

```bash
pnpm dev
```

Mở http://localhost:3000, đăng nhập bằng tài khoản seed ở trên.

## Tạo tài khoản mới (thủ công)

Dự án dùng cho một hộ kinh doanh, không có trang đăng ký công khai (`enable_signup = false`
trong `supabase/config.toml`). Tạo tài khoản mới bằng một trong hai cách:

1. Supabase Studio (http://127.0.0.1:54323 khi chạy local) → Authentication → Add user, sau đó
   thêm một dòng vào bảng `app_users` với cùng `id`, `display_name`, `role`.
2. Script dùng `SUPABASE_SERVICE_ROLE_KEY` (xem `.env.example`) gọi
   `supabase.auth.admin.createUser(...)` rồi insert vào `app_users`.

## Scripts

```bash
pnpm dev         # chạy dev server
pnpm build       # build production
pnpm lint        # eslint
pnpm typecheck   # next typegen + tsc --noEmit
pnpm test        # vitest run
pnpm test:watch  # vitest (watch mode)
```

## Supabase

- Migration: `supabase/migrations/` — mọi thay đổi schema đi qua đây, không sửa tay trên DB.
- Seed: `supabase/seed.sql` — chỉ dùng cho máy phát triển, không chạy trên production.
- Sinh lại type từ schema thật sau khi `supabase start`:

  ```bash
  npx supabase gen types typescript --local > src/lib/db/types.ts
  ```
