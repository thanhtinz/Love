import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

/**
 * Client Supabase dùng chung cho Auth + room_state + Realtime.
 * URL + anon key là key CÔNG KHAI phía client (bảo mật bằng RLS), nhúng sẵn trong app:
 * ưu tiên biến môi trường EXPO_PUBLIC_* khi build, fallback giá trị trong app.json extra.
 */
const extra = (Constants.expoConfig?.extra || {}) as { supabaseUrl?: string; supabaseAnonKey?: string };
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || "";

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    });
  }
  return client;
}
