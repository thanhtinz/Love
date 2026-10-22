-- Love Couple App — Supabase schema
-- Chạy file này trong Supabase Dashboard > SQL Editor
create table if not exists public.rooms (
  code text primary key,
  created_at timestamptz default now()
);
create table if not exists public.room_state (
  room_code text primary key references public.rooms(code) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table public.rooms enable row level security;
alter table public.room_state enable row level security;
-- Demo: cho phép anon đọc/ghi (chỉ dùng cho app couple cá nhân, hãy siết policy nếu public)
create policy "rooms anon all" on public.rooms for all using (true) with check (true);
create policy "room_state anon all" on public.room_state for all using (true) with check (true);
-- Bật Realtime: Dashboard > Database > Replication > chọn bảng room_state (hoặc chạy:)
-- alter publication supabase_realtime add table public.room_state;
-- App dùng Realtime Broadcast channel "love-room-<code>" nên không bắt buộc postgres_changes.
