# 💖 Khu Vườn Tình Yêu — Web App cho Couple

App cute chibi cho 2 người: **game trồng cây tình yêu có thư tình rơi ra**, mood, ghi chú, bucket list, câu hỏi mỗi ngày — tương tác **realtime** giữa 2 người.

## Tính năng

- **🌳 Game trồng cây (phần xịn nhất):** 7 giai đoạn (Hạt 🌰 → Mầm 🌱 → Cây con 🌿 → Cây lớn 🌳 → Nụ 🌷 → Nở hoa 🌸 → Cây trái tim 💖), chỉ số Nước/Nắng/Tình yêu, 4 hành động (Tưới, Tắm nắng, Bón tim, Bắt sâu) có cooldown 2.5s, particles riêng từng hành động (giọt nước ☔/tia nắng ☀️/tim hồng 💖), cây rung (`shakeTree`) + lớn dần theo `scale` từng giai đoạn, mưa tim/confetti + tỏa sáng khi lên cấp.
- **💌 Thông điệp tình yêu rơi ra từ cây:** xem mục cơ chế bên dưới.
- **📋 Nhiệm vụ mỗi ngày + 🔥 Streak + 🏆 Huy hiệu:** tưới 3 lần, bón tim 2 lần, cả 2 cùng chăm — nhận XP + thư thưởng; streak ngày liên tiếp; 8 huy hiệu (lần đầu, combo đầu tiên, nở hoa, cây trái tim, sưu tập 10 thư...).
- **Header chibi:** 2 avatar SVG tự vẽ, sửa tên 2 người, chọn "Tôi là A/B", đếm ngày yêu + countdown mốc 100/200/365... ngày, mã phòng, trạng thái kết nối.
- **🌈 Mood hôm nay** (mỗi người 1 mood, thấy nhau realtime), **📌 Love Notes** tường pastel thêm/xoá, **🎯 Bucket List** + thanh %, **💬 Câu hỏi mỗi ngày** (24 câu xoay vòng theo ngày, cả 2 trả lời mới mở khóa đáp án nhau), **🎲 Gợi ý hẹn hò ngẫu nhiên**.

## 💌 Cơ chế rơi thư (chi tiết)

| Tình huống | Tỉ lệ / Điều kiện | Hạng thư |
|---|---|---|
| Chăm cây bất kỳ | ~35% mỗi lần | Thường 💌 (cây đã nở hoa: 18% trong số đó nâng thành Huyền thoại) |
| Lên cấp (level up) | **Chắc chắn 100%** | Hiếm ✨ (lên cấp nở hoa trở đi: Huyền thoại 👑) |
| Đạt mốc tổng lần chăm 10/25/50/100/150/200/300 | **Chắc chắn 100%** | Hiếm ✨ |
| **Combo "Song chăm"**: người kia vừa chăm trong vòng **90 giây** và bạn chăm tiếp | **Chắc chắn 100%** + banner combo + huy hiệu | Hiếm ✨ viền vàng phát sáng |
| Nhận thưởng nhiệm vụ "Cả 2 cùng chăm" | **Chắc chắn 100%** | Hiếm ✨ |

- Thư rơi bằng animation CSS thật (`fall`: rơi từ tán cây, xoay 24°→-10°, đáp xuống gốc cây, thư Hiếm/Huyền thoại có `glow` phát sáng), nằm dưới gốc cây chờ bấm mở.
- Bấm thư → **modal mở thư** cute → bấm "Cất vào Hộp thư" mới tính đã mở (ghi người mở + ngày mở, hiện trong activity feed của cả 2).
- **Kho thư: 36 câu tiếng Việt** — 18 Thường, 10 Hiếm, 8 Huyền thoại (ưu tiên bốc câu chưa sở hữu để ít trùng).
- **Hộp thư tình yêu / Album:** tiến độ x/36, %, xem lại thư đã mở (kèm hạng/ngày/nguồn rơi), thư chưa mở hiện 🔒 bí mật + gợi ý cách mở.

## Realtime hoạt động thế nào?

1. **Mặc định (không cần cấu hình):** State lưu `localStorage` key `love-app-v1` + đồng bộ qua **BroadcastChannel** (`love-room-<mã phòng>`) + `storage` event. Mở **2 tab/trình duyệt cùng máy, cùng mã phòng** → tưới cây, rơi thư, mở thư, đổi mood, thêm note... hiện bên kia **ngay lập tức**, kèm activity feed trực tiếp. Lưu ý: lựa chọn "Tôi là A/B" là của từng máy/tab.
2. **Realtime thật khác máy (Supabase, tùy chọn):** `lib/realtime.ts` là lớp abstraction — nếu có env Supabase thì tự dùng thêm **Supabase Realtime Broadcast** channel theo mã phòng, không có env thì bỏ qua êm (lazy import, không crash, build bình thường).

## Chạy local

```bash
npm install
npm run dev   # mở http://localhost:3000
```

**Test realtime 2 tab:** mở app ở 2 tab (hoặc 2 trình duyệt), để cùng mã phòng (mặc định `LOVE01`), tab 1 chọn "Tôi là A", tab 2 chọn "Tôi là B" → chăm cây ở tab này, xem tab kia cập nhật + thư rơi. Muốn test combo: hai tab chăm cây cách nhau <90 giây.

## Bật realtime thật bằng Supabase

1. Tạo project tại [supabase.com](https://supabase.com) → lấy **Project URL** và **anon key** (Settings → API).
2. Vào **SQL Editor**, chạy toàn bộ file [`supabase/schema.sql`](supabase/schema.sql) (tạo bảng `rooms` + `room_state` + policy demo).
3. Tạo file `.env.local` từ `.env.example`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. `npm run dev` lại. Hai máy/điện thoại mở cùng link deploy (Vercel...), nhập **cùng mã phòng 6 ký tự** là sync qua Broadcast channel của Supabase.
> ⚠️ Policy trong schema là bản demo cho app cá nhân 2 người. Nếu public rộng, hãy siết RLS lại.

## Cấu trúc thư mục

```
src/app/            layout.tsx (font Baloo 2 + Quicksand), page.tsx (tabs), globals.css
src/lib/            types.ts (state, giai đoạn cây, hạng thư), data.ts (24 câu hỏi, 15 ý tưởng hẹn, 36 thư tình, quests, huy hiệu),
                    store.tsx (Context + reducer + localStorage + broadcast), realtime.ts (BroadcastChannel + Supabase optional)
src/components/     Header.tsx, TreeGame.tsx (cây + rơi thư + modal + hộp thư + nhiệm vụ), Widgets.tsx (Mood/Notes/Bucket/Câu hỏi/Hẹn hò/Feed),
                    ChibiAvatar.tsx (SVG chibi), FloatingHearts.tsx
supabase/schema.sql
```

Stack: Next.js 14 App Router + React 18 + TypeScript + Tailwind CSS 3. Không backend nặng, không ảnh binary (toàn emoji + SVG component).

## Hạn chế đã biết

- Không có đăng nhập: ai biết mã phòng + mở cùng link là vào được phòng đó (đúng tinh thần app 2 người); state sync là "toàn bộ state, last-write-wins" nên nếu 2 người thao tác *cùng một mili-giây* có thể ghi đè nhau (hiếm khi xảy ra thực tế).
- Chế độ mặc định chỉ sync cùng máy; khác máy bắt buộc bật Supabase như hướng dẫn trên.
- Chỉ số Nước/Nắng/Tình yêu chỉ tăng khi chăm, chưa tự giảm theo thời gian.
