import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { formatISODateVN } from "@/lib/date";
import type { Database } from "@/lib/db/types";

/**
 * Route được gọi bởi cron bên ngoài (chưa bật pg_cron ở Supabase local) để chốt
 * snapshot_stock hằng đêm. Không có session người dùng nên dùng service-role key
 * (chỉ ở server, không export ra bất kỳ đâu khác) và tự xác thực bằng CRON_SECRET,
 * không qua RLS thông thường.
 *
 * Gọi: POST /api/cron/snapshot-stock?date=yyyy-MM-dd (bỏ trống = hôm qua theo giờ VN)
 * Header: x-cron-secret: <CRON_SECRET>
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Thiếu cấu hình Supabase service role" }, { status: 500 });
  }

  const date = request.nextUrl.searchParams.get("date") ?? formatISODateVN(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);
  const { error } = await supabase.rpc("snapshot_stock", { p_date: date });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, date });
}
