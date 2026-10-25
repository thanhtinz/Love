-- ============================================================================
-- couple-photos — bucket Storage RIÊNG TƯ cho ẢNH CỦA HAI ĐỨA (đợt "chất app" 3).
-- Mỗi cặp đôi có đúng MỘT object ở đường dẫn "{coupleId}/photo.jpg" (app ghi
-- đè tại chỗ khi đổi ảnh). Bucket private: app hiển thị ảnh qua signed URL
-- tạm (lib/photo.ts), không có URL công khai nào cho ảnh của hai người.
--
-- RLS trên storage.objects: một user chỉ được xem/thêm/sửa/xoá object mà
-- ĐOẠN ĐẦU đường dẫn của nó bằng id của một cặp đôi mà user là thành viên
-- (tra trong public.couple_members). Ảnh của cặp đôi khác là vô hình và
-- không chạm vào được.
--
-- Cách chạy (chủ dự án): Supabase Dashboard -> SQL Editor -> dán toàn bộ file
-- này -> Run. Chạy lại an toàn (idempotent).
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('couple-photos', 'couple-photos', false)
on conflict (id) do nothing;

-- Thuộc về cặp đôi của mình: đoạn đầu đường dẫn = couple_id mà user là thành viên.
drop policy if exists "couple_photos_select_member" on storage.objects;
create policy "couple_photos_select_member" on storage.objects
  for select using (
    bucket_id = 'couple-photos'
    and (storage.foldername(name))[1] in (
      select couple_id::text from public.couple_members where user_id = auth.uid()
    )
  );

drop policy if exists "couple_photos_insert_member" on storage.objects;
create policy "couple_photos_insert_member" on storage.objects
  for insert with check (
    bucket_id = 'couple-photos'
    and (storage.foldername(name))[1] in (
      select couple_id::text from public.couple_members where user_id = auth.uid()
    )
  );

drop policy if exists "couple_photos_update_member" on storage.objects;
create policy "couple_photos_update_member" on storage.objects
  for update using (
    bucket_id = 'couple-photos'
    and (storage.foldername(name))[1] in (
      select couple_id::text from public.couple_members where user_id = auth.uid()
    )
  ) with check (
    bucket_id = 'couple-photos'
    and (storage.foldername(name))[1] in (
      select couple_id::text from public.couple_members where user_id = auth.uid()
    )
  );

drop policy if exists "couple_photos_delete_member" on storage.objects;
create policy "couple_photos_delete_member" on storage.objects
  for delete using (
    bucket_id = 'couple-photos'
    and (storage.foldername(name))[1] in (
      select couple_id::text from public.couple_members where user_id = auth.uid()
    )
  );
