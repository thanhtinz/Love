-- ============================================================================
-- push_tokens — mã Expo Push Token của từng người dùng, cho đường push note.
-- App (lib/push.ts) upsert token của CHÍNH user sau khi được cấp quyền thông
-- báo; edge function notify-note đọc token của NGƯỜI ẤY bằng service role
-- (bỏ qua RLS) để gửi thông báo. Người dùng thường KHÔNG BAO GIỜ đọc được
-- token của người khác qua API.
--
-- Cách chạy (chủ dự án): Supabase Dashboard -> SQL Editor -> dán toàn bộ file
-- này -> Run. Chạy lại an toàn (idempotent).
-- ============================================================================

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- Mỗi người chỉ xem/thêm/sửa/xoá token của chính mình.
drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own" on public.push_tokens
  for select using (auth.uid() = user_id);

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own" on public.push_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own" on public.push_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own" on public.push_tokens
  for delete using (auth.uid() = user_id);
