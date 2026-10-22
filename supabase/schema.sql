-- ============================================================
-- Khu Vườn Tình Yêu — Supabase schema V3 (tài khoản + ghép cặp)
-- Cách dùng: Supabase Dashboard > SQL Editor > dán toàn bộ file này > Run.
-- V3 thay thế schema V2 (bảng rooms/room_state theo mã phòng cũ) —
-- hai lệnh drop bên dưới chỉ xoá đúng 2 bảng cũ của app này.
-- ============================================================
drop table if exists public.room_state cascade;
drop table if exists public.rooms cascade;

-- ---------- 1. Bảng dữ liệu ----------

-- Hồ sơ người dùng (gắn với auth.users của Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar text not null default 'svg-a',
  created_at timestamptz not null default now()
);

-- Một "khu vườn" của một cặp đôi
create table if not exists public.couples (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,               -- mã mời 6 ký tự, duy nhất
  start_date date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Thành viên của vườn: tối đa 2 người, mỗi người 1 slot (A/B)
create table if not exists public.couple_members (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  slot text not null check (slot in ('A', 'B')),
  created_at timestamptz not null default now(),
  primary key (couple_id, user_id),
  unique (couple_id, slot),        -- mỗi ghế chỉ 1 người
  unique (user_id)                 -- mỗi tài khoản thuộc tối đa 1 vườn tại một thời điểm
);

-- Toàn bộ state khu vườn (cây, thư, xu, kỷ niệm...) dạng JSON, 1 dòng / couple
create table if not exists public.room_state (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- 2. Hàm hỗ trợ RLS ----------

-- Danh sách couple mà user hiện tại thuộc về.
-- security definer để policy trên couple_members không bị đệ quy RLS.
create or replace function public.my_couple_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$ select couple_id from public.couple_members where user_id = auth.uid() $$;

grant execute on function public.my_couple_ids() to authenticated;

-- ---------- 3. RPC ghép cặp (logic kiểm tra nằm ở server) ----------

-- Tạo vườn mới: người tạo ngồi ghế A, nhận mã mời p_code. Trả về id của couple.
create or replace function public.create_couple(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'ALREADY_IN_COUPLE';
  end if;
  insert into public.couples (code, start_date, created_by)
  values (upper(p_code), current_date, auth.uid())
  returning id into v_id;
  insert into public.couple_members (couple_id, user_id, slot) values (v_id, auth.uid(), 'A');
  return v_id;
end $$;

-- Vào vườn bằng mã mời: sai mã -> CODE_NOT_FOUND, vườn đủ 2 người -> COUPLE_FULL.
create or replace function public.join_couple(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_couple public.couples%rowtype; v_count int; v_slot text;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_couple from public.couples where code = upper(p_code);
  if not found then raise exception 'CODE_NOT_FOUND'; end if;
  -- Đã là thành viên của chính vườn này rồi thì trả về luôn (idempotent)
  if exists (select 1 from public.couple_members where couple_id = v_couple.id and user_id = auth.uid()) then
    return v_couple.id;
  end if;
  if exists (select 1 from public.couple_members where user_id = auth.uid()) then
    raise exception 'ALREADY_IN_COUPLE';
  end if;
  select count(*) into v_count from public.couple_members where couple_id = v_couple.id;
  if v_count >= 2 then raise exception 'COUPLE_FULL'; end if;
  select case when exists (select 1 from public.couple_members where couple_id = v_couple.id and slot = 'A') then 'B' else 'A' end into v_slot;
  insert into public.couple_members (couple_id, user_id, slot) values (v_couple.id, auth.uid(), v_slot);
  return v_couple.id;
end $$;

grant execute on function public.create_couple(text) to authenticated;
grant execute on function public.join_couple(text) to authenticated;

-- ---------- 4. Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.room_state enable row level security;

-- profiles: user đã đăng nhập đọc được hồ sơ (để hiện tên/avatar của bạn cặp),
-- chỉ tự tạo / tự sửa hồ sơ của mình.
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles
  for select to authenticated using (true);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- couples: chỉ thành viên mới thấy vườn của mình; tạo vườn đi qua RPC create_couple
-- (policy insert dưới đây chỉ là đường dự phòng cho insert trực tiếp của chính chủ).
drop policy if exists "couples read members" on public.couples;
create policy "couples read members" on public.couples
  for select to authenticated using (id in (select public.my_couple_ids()));
drop policy if exists "couples insert own" on public.couples;
create policy "couples insert own" on public.couples
  for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "couples update members" on public.couples;
create policy "couples update members" on public.couples
  for update to authenticated using (id in (select public.my_couple_ids())) with check (id in (select public.my_couple_ids()));

-- couple_members: xem thành viên của vườn mình thuộc về; tự xoá chính mình = rời vườn.
-- (Việc thêm thành viên đi qua RPC join_couple/create_couple ở chế độ security definer.)
drop policy if exists "members read" on public.couple_members;
create policy "members read" on public.couple_members
  for select to authenticated using (couple_id in (select public.my_couple_ids()) or user_id = auth.uid());
drop policy if exists "members insert self" on public.couple_members;
create policy "members insert self" on public.couple_members
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "members delete self" on public.couple_members;
create policy "members delete self" on public.couple_members
  for delete to authenticated using (user_id = auth.uid());

-- room_state: chỉ thành viên của couple mới đọc/ghi được state vườn của couple đó.
drop policy if exists "room_state read" on public.room_state;
create policy "room_state read" on public.room_state
  for select to authenticated using (couple_id in (select public.my_couple_ids()));
drop policy if exists "room_state insert" on public.room_state;
create policy "room_state insert" on public.room_state
  for insert to authenticated with check (couple_id in (select public.my_couple_ids()));
drop policy if exists "room_state update" on public.room_state;
create policy "room_state update" on public.room_state
  for update to authenticated using (couple_id in (select public.my_couple_ids())) with check (couple_id in (select public.my_couple_ids()));

-- Realtime: app dùng Realtime Broadcast channel "love-room-<couple_id>"
-- nên KHÔNG cần bật postgres_changes cho room_state.
-- Nếu muốn xác nhận email khi đăng ký: Authentication > Providers > Email >
-- "Confirm email" (bật = user phải bấm link trong email trước lần đăng nhập đầu).
