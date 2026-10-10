import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/** Supabase client dùng trong Client Component (trình duyệt). */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
