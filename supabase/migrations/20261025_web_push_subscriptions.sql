-- ============================================================================
-- web_push_subscriptions — đăng ký Web Push (chuẩn Push API của trình duyệt)
-- của từng người dùng, cho đường thông báo của BẢN WEB.
-- App web (lib/webpush.ts) upsert đăng ký của CHÍNH user sau khi trình duyệt
-- cấp quyền thông báo: mỗi đăng ký là một endpoint của hãng trình duyệt +
-- cặp khóa mã hoá (p256dh/auth) để edge function mã hoá nội dung theo
-- RFC 8291 trước khi gửi. Edge function notify-note / notify-heartbeat đọc
-- đăng ký của NGƯỜI ẤY bằng service role (bỏ qua RLS) để gửi thông báo web,
-- và XOÁ đăng ký khi endpoint trả 404/410 (đăng ký đã chết).
-- Đây là đường RIÊNG với push_tokens (Expo Push cho app điện thoại) — hai
-- đường chạy song song, không thay thế nhau.
--
-- Cách chạy (chủ dự án): Supabase Dashboard -> SQL Editor -> dán toàn bộ file
-- này -> Run. Chạy lại an toàn (idempotent).
-- ============================================================================

create table if not exists public.web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists web_push_subscriptions_user_id_idx on public.web_push_subscriptions (user_id);

alter table public.web_push_subscriptions enable row level security;

-- Mỗi người chỉ xem/thêm/sửa/xoá đăng ký của chính mình.
drop policy if exists "web_push_subscriptions_select_own" on public.web_push_subscriptions;
create policy "web_push_subscriptions_select_own" on public.web_push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "web_push_subscriptions_insert_own" on public.web_push_subscriptions;
create policy "web_push_subscriptions_insert_own" on public.web_push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "web_push_subscriptions_update_own" on public.web_push_subscriptions;
create policy "web_push_subscriptions_update_own" on public.web_push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "web_push_subscriptions_delete_own" on public.web_push_subscriptions;
create policy "web_push_subscriptions_delete_own" on public.web_push_subscriptions
  for delete using (auth.uid() = user_id);
