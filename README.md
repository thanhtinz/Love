# 💖 Khu Vườn Tình Yêu — Web App cho Couple

App cute chibi cho 2 người: **game trồng cây tình yêu có thư tình rơi ra**, mood, ghi chú, bucket list, câu hỏi mỗi ngày — tương tác **realtime** giữa 2 người.

## 🆕 Có gì mới ở V2

- **🌱 Cây "sống thật":** chỉ số Nước/Nắng/Tình yêu **tự giảm theo thời gian thực** (Nước −2.5/giờ, Nắng −1.8/giờ, Tình yêu −1.2/giờ, tính từ mốc `statsAt` lưu trong state; áp dụng khi mở app + tick mỗi phút). Chỉ số thấp → cây **héo thật**: chuyển thành 🥀 xám cụp xuống, thanh chỉ số đỏ cảnh báo, banner theo chỉ số thiếu ("Cây đang khát nước nè 🥺"...). Chăm lại là cây tươi lại ngay.
- **🪙 Xu Tim + 🛍️ Cửa hàng trang trí vườn:** kiếm Xu Tim khi chăm cây (+4~6), nhận nhiệm vụ ngày (+20), mở thư (+10 Thường / +25 Hiếm / +50 Huyền thoại). Dùng mua & trang bị **4 chậu** (đất nung / gốm xanh 60 / hồng chibi 90 / vàng hoàng kim 180), **4 nền cảnh** (theo giờ thật / hoàng hôn 80 / đêm sao 100 / cầu vồng 150), **4 phụ kiện** (nơ hồng 40 / chuông gió 55 / đèn lồng 70 / đàn bướm 85). Có sẵn **50 Xu Tim khởi đầu** + **30 Xu Tim quà onboarding** → mua được Nơ hồng ngay hôm đầu. Đồ đã mua + đồ đang trang bị sync realtime cho cả 2.
- **💞 Hành động yêu thương nhanh:** Ôm 🤗 / Hôn gió 😘 / Tặng hoa 💐 / Thả sao ⭐ — bấm là **người kia nhận popup nổi bật realtime** (qua field `lastLoveAction` có timestamp), đồng thời ghi vào activity feed.
- **📸 Dòng kỷ niệm (tab mới):** thêm kỷ niệm gồm tiêu đề, ngày, mô tả, URL ảnh tuỳ chọn (ảnh lỗi → tự fallback 🌸), hiển thị **timeline dọc**, xoá được, sync realtime.
- **👋 Onboarding lần đầu:** modal chào mừng cute → nhập tên 2 người, ngày bắt đầu yêu, chọn "tôi là ai", mã phòng (có nút tạo ngẫu nhiên) → lưu xong mới vào app, vào lại không hiện nữa (mở lại được bằng nút trong ⚙️ Sửa ở Header). State cũ V1 được `normalizeState` nâng cấp mượt, không mất dữ liệu và không bị bắt onboard lại.
- **🎨 Giao diện:** cảnh vườn **đổi theo giờ thật** (sáng 🌅 / ngày ☀️ / hoàng hôn 🌇 / đêm 🌙 có sao & đom đóm), **bướm bay** 🦋 quanh cây khi cây khoẻ, hoa cỏ dưới gốc **nhiều dần theo cấp cây**, Header **sticky glass**, chuyển tab có animation, mưa cánh hoa 🌸 nhẹ ở trang chủ.
- **📱 PWA cơ bản:** `public/manifest.json` (standalone, theme hồng) + `public/icon.svg` → trên điện thoại chọn **"Thêm vào màn hình chính"** là dùng như app thật.

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

## 🚀 Deploy lên Vercel (xem demo trực tiếp)

1. Push repo này lên GitHub (đã có sẵn tại `thanhtinz/Love`).
2. Vào [vercel.com](https://vercel.com) → **Add New → Project** → **Import** repo GitHub vừa chọn → framework tự nhận diện **Next.js**, giữ nguyên mọi cấu hình mặc định.
3. Bấm **Deploy** — **không cần điền env nào** nếu chỉ xem demo: realtime chạy qua BroadcastChannel (mở 2 tab cùng máy/cùng mã phòng trên link demo là thấy nhau ngay), toàn bộ tính năng V2 (cây héo theo thời gian, Xu Tim, shop, kỷ niệm, onboarding, PWA) hoạt động đầy đủ.
4. (Tuỳ chọn) Muốn **2 điện thoại khác máy sync thật**: thêm 2 Environment Variables `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` trong Vercel (Settings → Environment Variables) theo mục Supabase bên dưới rồi Redeploy.
5. Sau khi deploy xong, mở link `*.vercel.app` trên điện thoại → menu trình duyệt → **"Thêm vào màn hình chính"** để cài như app (nhờ PWA manifest + icon).

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
src/app/            layout.tsx (font Baloo 2 + Quicksand, metadata PWA), page.tsx (6 tabs + onboarding + toast + mưa cánh hoa), globals.css
src/lib/            types.ts (state, giai đoạn cây, decay/thống kê sống, Xu Tim, hạng thư), data.ts (24 câu hỏi, 15 ý tưởng hẹn, 36 thư tình, quests, huy hiệu, SHOP_ITEMS, LOVE_ACTIONS),
                    store.tsx (Context + reducer + localStorage + broadcast + TICK decay mỗi phút), realtime.ts (BroadcastChannel + Supabase optional)
src/components/     Header.tsx (sticky glass, số dư Xu Tim), TreeGame.tsx (cây sống + cảnh theo giờ + rơi thư + modal + hộp thư + nhiệm vụ),
                    Shop.tsx (cửa hàng trang trí), LoveActions.tsx (gửi yêu thương + popup người nhận), Memories.tsx (timeline kỷ niệm),
                    Onboarding.tsx (modal chào mừng lần đầu), Widgets.tsx (Mood/Notes/Bucket/Câu hỏi/Hẹn hò/Feed),
                    ChibiAvatar.tsx (SVG chibi), FloatingHearts.tsx
public/             manifest.json (PWA), icon.svg
supabase/schema.sql
```

Stack: Next.js 14 App Router + React 18 + TypeScript + Tailwind CSS 3. Không backend nặng, không ảnh binary (toàn emoji + SVG component).

## Hạn chế đã biết

- Không có đăng nhập: ai biết mã phòng + mở cùng link là vào được phòng đó (đúng tinh thần app 2 người); state sync là "toàn bộ state, last-write-wins" nên nếu 2 người thao tác *cùng một mili-giây* có thể ghi đè nhau (hiếm khi xảy ra thực tế).
- Chế độ mặc định chỉ sync cùng máy; khác máy bắt buộc bật Supabase như hướng dẫn trên.
- Decay của cây được "ghi sổ" (materialize) khi mở app / tick mỗi phút / mỗi lần chăm cây — nếu cả 2 người cùng mở app sau thời gian dài, số liệu có thể chênh nhau rất nhỏ trong chốc lát rồi tự khớp ở lần sync tiếp theo (vẫn là cơ chế last-write-wins).
- PWA ở mức cơ bản (manifest + icon, chưa có service worker/offline đầy đủ và icon PNG cho mọi kích thước — một số máy Android đời cũ có thể hiện icon SVG chưa tối ưu).
