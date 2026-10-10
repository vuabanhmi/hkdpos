import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/db/server";
import { logout } from "./actions";

// Mọi trang trong nhóm (app) đọc cookie phiên đăng nhập ở layout này (dữ liệu theo từng
// request), nên không thể dựng sẵn tĩnh lúc build. Tắt validate "instant navigation" và
// static shell cho cả nhóm, theo hướng dẫn migrate Cache Components của Next.js 16.
export const instant = false;

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/products", label: "Sản phẩm" },
  { href: "/products/categories", label: "Danh mục" },
  { href: "/price-lists", label: "Bảng giá" },
  { href: "/inventory", label: "Kho" },
  { href: "/inventory/stocktakes", label: "Kiểm kho" },
  { href: "/reports/inventory", label: "Báo cáo xuất nhập tồn" },
  { href: "/contacts", label: "Đối tác" },
  { href: "/pos", label: "Bán hàng" },
  { href: "/orders", label: "Đơn hàng" },
  { href: "/counters", label: "Quầy bán hàng" },
  { href: "/reports/counters", label: "Báo cáo theo quầy" },
  { href: "/cashbook", label: "Thu chi" },
  { href: "/ledger", label: "Sổ sách" },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Supabase client đọc phiên đăng nhập và tự kiểm tra hết hạn bằng Date.now() ngay khi
  // khởi tạo — một truy cập "động" mà Next.js không tự nhận ra qua cookies()/await thường.
  // Phải gọi connection() trước để báo rõ nhánh render này cần dữ liệu theo request, tránh
  // lỗi "unstable value Date.now() while prerendering" của Cache Components (Next.js 16).
  await connection();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: appUser } = await supabase
    .from("app_users")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!appUser) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-medium">Tài khoản chưa được cấp quyền truy cập.</p>
        <p className="text-sm text-muted-foreground">
          Liên hệ chủ hộ để được thêm vào danh sách người dùng.
        </p>
        <form action={logout}>
          <Button variant="outline" type="submit">
            Đăng xuất
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <aside className="flex w-56 flex-col border-r bg-muted/30 px-3 py-4">
        <div className="mb-6 px-2">
          <p className="text-sm font-semibold">Hộ kinh doanh</p>
          <p className="text-xs text-muted-foreground">{appUser.display_name}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logout}>
          <Button variant="outline" size="sm" type="submit" className="w-full">
            Đăng xuất
          </Button>
        </form>
      </aside>
      <main className="flex-1 bg-background p-6">{children}</main>
    </div>
  );
}
