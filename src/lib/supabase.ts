/**
 * Client Supabase DÙNG CHUNG cho cả Auth, lưu trữ state vườn (room_state) và Realtime.
 * Dùng chung một client là bắt buộc: session đăng nhập (Supabase Auth) nằm trong client này
 * thì RLS của room_state / profiles / couples mới nhận diện được người dùng.
 * Client được LAZY-LOAD (dynamic import): không có env -> trả null và không tải
 * thư viện supabase-js vào bundle ban đầu; app chạy chế độ tài khoản LOCAL trên máy.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const HAS_SUPABASE = Boolean(url && anonKey);

let cached: SupabaseClient | null | undefined;
let loading: Promise<SupabaseClient | null> | null = null;

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (cached !== undefined) return cached;
  if (!HAS_SUPABASE) { cached = null; return null; }
  if (!loading) {
    loading = import("@supabase/supabase-js")
      .then((m) => { cached = m.createClient(url as string, anonKey as string); return cached; })
      .catch(() => { cached = null; return null; });
  }
  return loading;
}

/** Client đã load sẵn (nếu có) — dùng cho đường realtime không await được. */
export function getSupabaseSync(): SupabaseClient | null { return cached ?? null; }
