# Khu Vườn Tình Yêu — Web App cho Couple

App cute chibi cho 2 người: **game trồng cây tình yêu có thư tình rơi ra**, mood, ghi chú, bucket list, câu hỏi mỗi ngày — tương tác **realtime** giữa 2 người.

## Có gì mới ở V4 — Icon CSS/SVG thay toàn bộ emoji

- Hệ thống không còn dùng emoji ở bất kỳ đâu trong giao diện: mọi biểu tượng là **icon SVG inline + CSS** tự vẽ trong `src/components/Icon.tsx` (hơn 60 icon: tim, giọt nước, mặt trời, thư, vương miện...), màu/size/animation điều khiển bằng Tailwind.
- Mặt cảm xúc (mood) là component `FaceIcon` vẽ SVG với 12 biến thể; cây 7 giai đoạn là component `TreeArt` SVG lớn dần theo cấp; avatar thú chibi cũng vẽ SVG từng loài.
- Dữ liệu cũ (mood/activity đã lưu bằng emoji từ V1–V3) được tự động map/strip khi hiển thị nên không vỡ dữ liệu của người dùng hiện tại.

## Có gì mới ở V3 — Tài khoản riêng cho mỗi người

- **👤 Mỗi người một tài khoản, tự đăng ký / đăng nhập:** mở app chưa login là chỉ thấy màn hình **Đăng nhập / Đăng ký** (email + mật khẩu có hiện/ẩn, tối thiểu 6 ký tự, tên hiển thị, chọn avatar chibi từ 12 mẫu). Có **đăng xuất** (ở Header + phần cài đặt), báo lỗi tiếng Việt thân thiện (email đã tồn tại, sai mật khẩu...).
- **💞 Ghép cặp bằng mã mời sau khi login:** chưa có cặp → chọn **"Tạo khu vườn mới"** (bạn ngồi ghế A, nhận **mã mời 6 ký tự**) hoặc **"Nhập mã mời"** của người thương (vào ghế B). Tối đa **2 người/vườn**; mã sai hoặc vườn đã đủ 2 người đều báo lỗi rõ ràng. Tên + avatar trong vườn **lấy từ hồ sơ tài khoản** của từng người (không còn chọn tay "Tôi là A/B").
- **🏡 Thiết lập vườn sau ghép cặp:** đặt **tên khu vườn** + **ngày bắt đầu yêu** (vẫn giữ quà +30 Xu Tim lần đầu). Mục **"Tài khoản & Khu vườn"** trong ⚙️ Sửa ở Header: xem thành viên + mã mời (bấm chép), đổi tên/avatar của mình, **Rời khu vườn** (có xác nhận — dữ liệu vườn được giữ lại cho người còn lại), đăng xuất.
- **🔒 Dữ liệu scope theo couple:** mỗi vườn có state riêng theo `couple id` (local: key `love-garden-<coupleId>`; Supabase: bảng `room_state` theo `couple_id` + realtime broadcast theo channel của couple). Khu vườn cũ của V2 (key `love-app-v1`) sẽ được **couple đầu tiên tạo trên máy này nhận lại (claim)** — không mất cây, thư, xu đã có.

## Tài khoản & đăng nhập — 2 chế độ

App tự nhận diện chế độ theo biến môi trường, không cần cấu hình gì thêm:

| | Chế độ LOCAL (mặc định, bản demo) | Chế độ SUPABASE (khi có env) |
|---|---|---|
| Điều kiện | Không có `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Có đủ 2 env trên |
| Đăng ký/đăng nhập | Lưu trên **chính thiết bị này** (`localStorage` key `love-accounts-v1`) | **Supabase Auth** thật (`signUp` / `signInWithPassword`), session tự duy trì |
| Mật khẩu | **Băm SHA-256 kèm salt ngẫu nhiên** (Web Crypto, lặp 1000 vòng) — không bao giờ lưu mật khẩu gốc | Do Supabase Auth quản lý (băm bcrypt phía server) |
| Hồ sơ | Trong bản ghi tài khoản local | Bảng `profiles` (display_name, avatar) |
| Ghép cặp | Bảng couple lưu local trên máy (`love-couples-v1`) — 2 tài khoản trên **cùng máy** vào được cùng vườn | RPC `create_couple` / `join_couple` phía server (kiểm tra mã, giới hạn 2 người), bảng `couples` + `couple_members` + **RLS** chỉ cho thành viên đọc/ghi dữ liệu vườn của mình |
| Quên mật khẩu | ⚠️ Không khôi phục được (mật khẩu đã băm một chiều) — app báo rõ điều này ngay tại màn hình | Gửi email reset password của Supabase ✅ |
| Dùng được ở đâu | Chỉ trên thiết bị đã đăng ký | Mọi thiết bị, **2 điện thoại sync thật** |

**Luồng sử dụng:** Đăng ký (email, mật khẩu, tên, avatar) → Đăng nhập → Tạo vườn mới (nhận mã mời) *hoặc* nhập mã mời của người thương → Đặt tên vườn + ngày bắt đầu yêu → Vào vườn chơi. Người tạo là ghế A, người nhập mã là ghế B.

## Có gì mới ở V2

- **🌱 Cây "sống thật":** chỉ số Nước/Nắng/Tình yêu **tự giảm theo thời gian thực** (Nước −2.5/giờ, Nắng −1.8/giờ, Tình yêu −1.2/giờ, tính từ mốc `statsAt` lưu trong state; áp dụng khi mở app + tick mỗi phút). Chỉ số thấp → cây **héo thật**: chuyển thành 🥀 xám cụp xuống, thanh chỉ số đỏ cảnh báo, banner theo chỉ số thiếu ("Cây đang khát nước nè 🥺"...). Chăm lại là cây tươi lại ngay.
- **🪙 Xu Tim + 🛍️ Cửa hàng trang trí vườn:** kiếm Xu Tim khi chăm cây (+4~6), nhận nhiệm vụ ngày (+20), mở thư (+10 Thường / +25 Hiếm / +50 Huyền thoại). Dùng mua & trang bị **4 chậu** (đất nung / gốm xanh 60 / hồng chibi 90 / vàng hoàng kim 180), **4 nền cảnh** (theo giờ thật / hoàng hôn 80 / đêm sao 100 / cầu vồng 150), **4 phụ kiện** (nơ hồng 40 / chuông gió 55 / đèn lồng 70 / đàn bướm 85). Có sẵn **50 Xu Tim khởi đầu** + **30 Xu Tim quà onboarding** → mua được Nơ hồng ngay hôm đầu. Đồ đã mua + đồ đang trang bị sync realtime cho cả 2.
- **💞 Hành động yêu thương nhanh:** Ôm 🤗 / Hôn gió 😘 / Tặng hoa 💐 / Thả sao ⭐ — bấm là **người kia nhận popup nổi bật realtime** (qua field `lastLoveAction` có timestamp), đồng thời ghi vào activity feed.
- **📸 Dòng kỷ niệm (tab mới):** thêm kỷ niệm gồm tiêu đề, ngày, mô tả, URL ảnh tuỳ chọn (ảnh lỗi → tự fallback 🌸), hiển thị **timeline dọc**, xoá được, sync realtime.
- **👋 Onboarding lần đầu (V2):** modal chào mừng cute → nhập tên 2 người, ngày bắt đầu yêu, chọn "tôi là ai", mã phòng → lưu xong mới vào app. *(Từ V3, bước này được thay bằng: đăng nhập → ghép cặp bằng mã mời → đặt tên vườn + ngày bắt đầu yêu; tên/avatar lấy từ tài khoản.)* State cũ V1 được `normalizeState` nâng cấp mượt, không mất dữ liệu.
- **🎨 Giao diện:** cảnh vườn **đổi theo giờ thật** (sáng 🌅 / ngày ☀️ / hoàng hôn 🌇 / đêm 🌙 có sao & đom đóm), **bướm bay** 🦋 quanh cây khi cây khoẻ, hoa cỏ dưới gốc **nhiều dần theo cấp cây**, Header **sticky glass**, chuyển tab có animation, mưa cánh hoa 🌸 nhẹ ở trang chủ.
- **📱 PWA cơ bản:** `public/manifest.json` (standalone, theme hồng) + `public/icon.svg` → trên điện thoại chọn **"Thêm vào màn hình chính"** là dùng như app thật.

## Tính năng

- **🌳 Game trồng cây (phần xịn nhất):** 7 giai đoạn (Hạt 🌰 → Mầm 🌱 → Cây con 🌿 → Cây lớn 🌳 → Nụ 🌷 → Nở hoa 🌸 → Cây trái tim 💖), chỉ số Nước/Nắng/Tình yêu, 4 hành động (Tưới, Tắm nắng, Bón tim, Bắt sâu) có cooldown 2.5s, particles riêng từng hành động (giọt nước ☔/tia nắng ☀️/tim hồng 💖), cây rung (`shakeTree`) + lớn dần theo `scale` từng giai đoạn, mưa tim/confetti + tỏa sáng khi lên cấp.
- **💌 Thông điệp tình yêu rơi ra từ cây:** xem mục cơ chế bên dưới.
- **📋 Nhiệm vụ mỗi ngày + 🔥 Streak + 🏆 Huy hiệu:** tưới 3 lần, bón tim 2 lần, cả 2 cùng chăm — nhận XP + thư thưởng; streak ngày liên tiếp; 8 huy hiệu (lần đầu, combo đầu tiên, nở hoa, cây trái tim, sưu tập 10 thư...).
- **Header chibi:** 2 avatar theo tài khoản của 2 thành viên, tên khu vườn, đếm ngày yêu + countdown mốc 100/200/365... ngày, mã mời, số dư Xu Tim, trạng thái kết nối, chip tài khoản của bạn + đăng xuất.
- **🌈 Mood hôm nay** (mỗi người 1 mood, thấy nhau realtime), **📌 Love Notes** tường pastel thêm/xoá, **🎯 Bucket List** + thanh %, **💬 Câu hỏi mỗi ngày** (24 câu xoay vòng theo ngày, cả 2 trả lời mới mở khóa đáp án nhau), **🎲 Gợi ý hẹn hò ngẫu nhiên**.

## Cơ chế rơi thư (chi tiết)

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

1. **Mặc định (không cần cấu hình):** State của vườn lưu `localStorage` theo couple (key `love-garden-<coupleId>`) + đồng bộ qua **BroadcastChannel** (`love-room-<coupleId>`) + `storage` event. Hai tài khoản trên **cùng máy** (2 tab/2 trình duyệt), cùng vào một khu vườn → tưới cây, rơi thư, mở thư, đổi mood, thêm note... hiện bên kia **ngay lập tức**, kèm activity feed trực tiếp.
2. **Realtime thật khác máy (Supabase):** `lib/realtime.ts` là lớp abstraction — nếu có env Supabase thì tự dùng thêm **Supabase Realtime Broadcast** channel theo couple id, đồng thời state được lưu (debounce) lên bảng `room_state` theo `couple_id` để máy nào mở lên cũng thấy cùng một khu vườn. Không có env thì bỏ qua êm (lazy import, không crash, build bình thường).

## Chỉ dùng qua webapp đã cài (cổng PWA — V4)

Từ V4, app **chỉ hoạt động khi đã cài thành webapp (PWA standalone)** trên điện thoại:

- Mở domain bằng **trình duyệt thường** (điện thoại hay PC) -> bị chặn ở **màn hình hướng dẫn cài**, không thấy app/không thấy màn hình đăng nhập.
- Nhận diện standalone bằng `matchMedia('(display-mode: standalone)')` + `navigator.standalone` (iOS) trong component `AppGate`.
- **Android/Chrome:** menu 3 chấm -> "Cài đặt ứng dụng" / "Thêm vào màn hình chính". Nếu trình duyệt phát sự kiện `beforeinstallprompt`, màn hình hướng dẫn hiện nút **"Cài app ngay"** bấm 1 lần.
- **iPhone/Safari:** nút Chia sẻ -> "Thêm vào Màn hình chính" -> "Thêm" (iOS không có `beforeinstallprompt` nên chỉ có hướng dẫn từng bước).
- **PC/máy tính:** hiện **mã QR của chính domain** (sinh bằng thư viện `qrcode`) để quét bằng điện thoại + dòng địa chỉ dạng chữ. Lý do chặn PC: app thiết kế cho 2 chiếc điện thoại, dùng như app thật ngoài màn hình chính.
- Mở link trong **webview Zalo/Facebook** sẽ có thêm cảnh báo mở bằng Chrome/Safari vì webview không cài được PWA.
- Điều kiện cài đặt thật: `public/sw.js` (service worker, cache app shell, network-first cho same-origin, không cache/can thiệp request Supabase cross-origin) + icon PNG sinh bằng code tại `src/app/icons/icon-192`, `src/app/icons/icon-512`, `src/app/icons/apple-touch-icon` (dùng `ImageResponse` của `next/og`, repo không chứa file binary).

### Dev local khi cần test bằng trình duyệt

Cổng chặn có bypass **chỉ dành cho dev**: tạo file `.env.local` với `NEXT_PUBLIC_ALLOW_BROWSER=true` rồi chạy `npm run dev` — app sẽ mở thẳng trong trình duyệt. **Tuyệt đối không set biến này trên Vercel/production** (không set = chặn tuyệt đối như mô tả trên).

## Chạy local

```bash
npm install
npm run dev   # mở http://localhost:3000
```

## Deploy lên Vercel (xem demo trực tiếp)

1. Push repo này lên GitHub (đã có sẵn tại `thanhtinz/Love`).
2. Vào [vercel.com](https://vercel.com) → **Add New → Project** → **Import** repo GitHub vừa chọn → framework tự nhận diện **Next.js**, giữ nguyên mọi cấu hình mặc định.
3. Bấm **Deploy** — **không cần điền env nào** nếu chỉ xem demo: app chạy chế độ **tài khoản local** (đăng ký/đăng nhập trên chính thiết bị, realtime qua BroadcastChannel cùng máy), toàn bộ tính năng (tài khoản, ghép cặp, cây héo theo thời gian, Xu Tim, shop, kỷ niệm, PWA) hoạt động đầy đủ.
4. Muốn **2 điện thoại đăng nhập & sync thật**: thêm 2 Environment Variables `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` trong Vercel (Settings → Environment Variables) theo mục Supabase bên dưới rồi Redeploy.
5. Sau khi deploy xong, mở link `*.vercel.app` trên điện thoại → menu trình duyệt → **"Thêm vào màn hình chính"** để cài như app (nhờ PWA manifest + icon).

**Test nhanh trên 1 máy:** mở app ở 2 tab (hoặc 2 trình duyệt) → tab 1 đăng ký tài khoản A, tạo vườn, lấy mã mời → tab 2 đăng ký tài khoản B, nhập mã mời → chăm cây ở tab này, xem tab kia cập nhật + thư rơi. Muốn test combo: hai tab chăm cây cách nhau <90 giây.

## Bật tài khoản thật + realtime khác máy bằng Supabase

1. Tạo project tại [supabase.com](https://supabase.com) → lấy **Project URL** và **anon key** (Settings → API).
2. Vào **SQL Editor**, chạy toàn bộ file [`supabase/schema.sql`](supabase/schema.sql) — tạo bảng `profiles`, `couples`, `couple_members`, `room_state`, bật **RLS** với policy chỉ cho thành viên của couple đọc/ghi dữ liệu vườn của mình, kèm 2 hàm RPC `create_couple` / `join_couple` (kiểm tra mã mời + giới hạn 2 người ở phía server).
3. (Tuỳ chọn) Authentication → Providers → Email: bật/tắt **"Confirm email"** theo ý bạn. Nếu bật, người dùng phải bấm link xác nhận trong email trước lần đăng nhập đầu tiên (app có hiện thông báo hướng dẫn).
4. Tạo file `.env.local` từ `.env.example` (hoặc điền Environment Variables trên Vercel):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
5. Chạy lại `npm run dev` / Redeploy trên Vercel. Từ đây mỗi người **tự đăng ký tài khoản trên điện thoại của mình**, một người tạo vườn lấy mã mời, người kia nhập mã — dữ liệu vườn lưu trên cloud theo couple và sync realtime giữa 2 máy.

## Cấu trúc thư mục

```
src/app/            layout.tsx (font Baloo 2 + Quicksand, metadata PWA, AuthProvider > LoveProvider), page.tsx (cổng login/ghép cặp + 6 tabs + toast + mưa cánh hoa), globals.css
src/lib/            types.ts (state, giai đoạn cây, decay/thống kê sống, Xu Tim, hạng thư, AVATARS), data.ts (24 câu hỏi, 15 ý tưởng hẹn, 36 thư tình, quests, huy hiệu, SHOP_ITEMS, LOVE_ACTIONS),
                    auth.tsx (V3: tài khoản 2 chế độ Supabase/local + ghép cặp bằng mã mời), supabase.ts (client Supabase dùng chung, lazy-load),
                    store.tsx (Context + reducer + state scope theo couple + localStorage + broadcast + TICK decay + lưu room_state), realtime.ts (BroadcastChannel + Supabase optional)
src/components/     AuthScreens.tsx (V3: màn hình Đăng nhập/Đăng ký + Ghép cặp), AccountPanel.tsx (V3: Tài khoản & Khu vườn trong cài đặt),
                    Header.tsx (sticky glass, số dư Xu Tim, avatar theo tài khoản), TreeGame.tsx (cây sống + cảnh theo giờ + rơi thư + modal + hộp thư + nhiệm vụ),
                    Shop.tsx (cửa hàng trang trí), LoveActions.tsx (gửi yêu thương + popup người nhận), Memories.tsx (timeline kỷ niệm),
                    Onboarding.tsx (V3: đặt tên vườn + ngày bắt đầu yêu sau ghép cặp), Widgets.tsx (Mood/Notes/Bucket/Câu hỏi/Hẹn hò/Feed),
                    ChibiAvatar.tsx (SVG chibi + avatar theo tài khoản), FloatingHearts.tsx
public/             manifest.json (PWA), icon.svg
supabase/schema.sql (V3: profiles / couples / couple_members / room_state + RLS + RPC ghép cặp)
```

Stack: Next.js 14 App Router + React 18 + TypeScript + Tailwind CSS 3. Không backend nặng, không ảnh binary (toàn emoji + SVG component).

## Hạn chế đã biết

- Từ V3 app **đã có đăng nhập**: mỗi người một tài khoản. Ở chế độ local, tài khoản chỉ tồn tại trên thiết bị đã đăng ký (xoá dữ liệu trình duyệt là mất tài khoản + mật khẩu không khôi phục được vì đã băm một chiều); muốn tài khoản dùng mọi nơi hãy bật Supabase.
- State sync là "toàn bộ state, last-write-wins" nên nếu 2 người thao tác *cùng một mili-giây* có thể ghi đè nhau (hiếm khi xảy ra thực tế).
- Chế độ mặc định chỉ sync cùng máy; khác máy bắt buộc bật Supabase như hướng dẫn trên.
- Decay của cây được "ghi sổ" (materialize) khi mở app / tick mỗi phút / mỗi lần chăm cây — nếu cả 2 người cùng mở app sau thời gian dài, số liệu có thể chênh nhau rất nhỏ trong chốc lát rồi tự khớp ở lần sync tiếp theo (vẫn là cơ chế last-write-wins).
- PWA ở mức cơ bản (manifest + icon, chưa có service worker/offline đầy đủ và icon PNG cho mọi kích thước — một số máy Android đời cũ có thể hiện icon SVG chưa tối ưu).
