# Khu Vườn Tình Yêu — App mobile (Android + iOS)

App couple native dựng bằng **React Native + Expo (TypeScript, Expo Router)**, dùng chung 1 codebase cho Android và iOS. Đây là bản thay thế hoàn toàn cho bản webapp trước đây: trồng cây tình yêu theo **thời gian thật**, thư tình rơi khi chăm cây, mini-game và nhiều tiện ích cho hai người — đồng bộ realtime giữa 2 điện thoại qua **Supabase** (dùng lại nguyên project và schema của bản web, không đổi gì ở backend).

- Tên app: **Khu Vườn Tình Yêu** · slug: `love-couple-app`
- Android package / iOS bundle id: `com.thanhtinz.love`
- Expo SDK 58 · React Native 0.88 · React 19

## Tính năng

1. **Tài khoản riêng cho mỗi người**: đăng ký (email, mật khẩu, tên hiển thị, chọn avatar vẽ bằng SVG) / đăng nhập / đăng xuất; session tự khôi phục (lưu bằng AsyncStorage). Project Supabase đang tắt "Confirm email" nên đăng ký xong đăng nhập ngay.
2. **Ghép cặp bằng mã mời 6 ký tự**: tạo vườn (RPC `create_couple`) hoặc nhập mã của người ấy (RPC `join_couple`), tối đa 2 người/vườn, thông báo lỗi tiếng Việt. Sau khi ghép cặp: đặt **tên vườn + ngày bắt đầu yêu**.
3. **Vườn cây thời gian thật, nhiều loài**: 4 ô đất; 6 loài cây (Cây Tình Yêu ~7 ngày, Hướng Dương ~2 ngày, Sakura ~5 ngày, Xương Rồng ~10 ngày, Dâu Tây ~4 ngày + ra quả mỗi 12h sau trưởng thành, Cây Huyền Thoại ~30 ngày — khóa tới khi đã thu 1 cây trưởng thành vào kỷ niệm). Mỗi cây có chỉ số Nước/Nắng/Tình yêu riêng tự giảm theo giờ; tốc độ lớn theo sức khỏe (khỏe x1, yếu x0.5, héo <20 thì ngừng); cây vẫn lớn khi tắt app vì tăng trưởng được ghi sổ theo timestamp. Chăm cây (tưới/nắng/bón tim/bắt sâu) cộng tăng tốc +30/+30/+45/+20 phút và có cơ hội **rơi thư tình** (~35%; chắc chắn khi lên giai đoạn; Hiếm khi combo "Song chăm" 2 người chăm gần nhau hoặc chạm mốc tổng lần chăm). Hình cây vẽ bằng SVG đổi theo loài + giai đoạn + trạng thái héo. Hộp thư sưu tập đủ **36 lá thư** 3 hạng (Thường/Hiếm/Huyền thoại).
4. **Tiện ích**: đếm ngày yêu + đếm ngược mốc kỷ niệm; mood 2 người (khuôn mặt vector); câu hỏi mỗi ngày (cả 2 trả lời mới mở đáp án); ghi chú yêu thương; bucket list; dòng kỷ niệm; gợi ý hẹn hò; hành động yêu thương nhanh (ôm/hôn/hoa/sao) gửi qua realtime; Xu Tim + shop trang trí (chậu/nền/phụ kiện áp dụng lên cây và vườn); nhiệm vụ ngày + streak + huy hiệu.
5. **Mini-game**: (a) **Bắt tim bay** 30 giây — bảng điểm cao nhất của 2 người theo tuần; (b) **Vòng quay yêu thương** — 3 lượt/người/ngày, trúng Xu/XP/thư/nhiệm vụ hẹn hò; (c) **Hiểu ý nhau** — trắc nghiệm 4 câu/ngày, cả 2 trả lời mới mở % hợp ý.
6. **Khung & Widget**: 3 khung trong app (Đếm ngày yêu, Cây hôm nay, Mood hai người) + xuất **ảnh PNG** (lưu vào thư viện ảnh hoặc chia sẻ) để ghim ra màn hình chính bằng tiện ích ảnh của máy. _Widget sống tự cập nhật (Android App Widget / iOS WidgetKit) cần viết mã native riêng — là bước phát triển riêng ở giai đoạn sau, chưa có trong bản này._

Toàn bộ giao diện **không dùng emoji**: icon bằng `@expo/vector-icons` + SVG tự vẽ (cây, avatar, mặt mood).

## Cách chạy local

Yêu cầu: Node.js >= 22, điện thoại cài **Expo Go** (chạy thử nhanh) hoặc bản development build (xem dưới).

```bash
npm install
npx expo start
```

Quét QR bằng Expo Go để mở app. Lưu ý: app dùng vài thư viện có mã native ngoài phạm vi Expo Go ở một số bản (view-shot, media-library...) — nếu Expo Go báo lỗi module, hãy tạo development build:

```bash
npx eas-cli@latest build --profile development --platform android
npx expo start --dev-client
```

## Build bản cài đặt bằng EAS

Cấu hình sẵn trong `eas.json`:

| Profile       | Mục đích                                                        |
| ------------- | --------------------------------------------------------------- |
| `development` | Bản dev (APK + development client) để chạy với Metro            |
| `preview`     | **APK Android** để cài trực tiếp / gửi cho người ấy dùng thử    |
| `production`  | Bản phát hành (Android App Bundle .aab, tự tăng version code)  |

```bash
npx eas-cli@latest login            # đăng nhập tài khoản Expo (miễn phí)
npx eas-cli@latest build --profile preview --platform android    # ra APK
npx eas-cli@latest build --profile production --platform android # ra AAB nộp Google Play
npx eas-cli@latest build --profile preview --platform ios        # bản iOS (xem điều kiện dưới)
```

**Điều kiện build iOS:**

- Cần tài khoản Expo (miễn phí) để dùng EAS.
- Cài lên **máy thật / TestFlight / App Store**: bắt buộc có **Apple Developer Program** (99 USD/năm) — EAS sẽ lo chứng chỉ và provisioning.
- Chạy **iOS Simulator** trên máy Mac thì **không cần** Apple Developer: `eas build --profile preview --platform ios` với cấu hình simulator, hoặc `npx expo run:ios` nếu có Xcode.

Lần build đầu tiên, EAS sẽ hỏi tạo project và tự ghi `extra.eas.projectId` vào `app.json` — cứ đồng ý.

## Kiến trúc & backend Supabase

```
src/
  app/                  # Màn hình (Expo Router) — chỉ chứa route
    index.tsx           # Cổng điều hướng theo trạng thái đăng nhập/ghép cặp
    auth.tsx            # Đăng ký / đăng nhập
    pair.tsx            # Tạo vườn / nhập mã mời / đặt tên vườn + ngày yêu
    (tabs)/
      garden.tsx        # Vườn cây: chăm cây, thư rơi, nhiệm vụ, lên giai đoạn
      letters.tsx       # Hộp thư + bộ sưu tập 36 lá
      games.tsx         # 3 mini-game
      utilities.tsx     # Đếm ngày, mood, câu hỏi ngày, notes, bucket, kỷ niệm, shop
      widgets.tsx       # Khung kỷ niệm + xuất ảnh PNG
      account.tsx       # Hồ sơ, thông tin vườn, rời vườn, đăng xuất
  components/           # Avatar, FaceIcon (mood), PlantArt (cây SVG), ui dùng chung
  lib/
    types.ts            # Kiểu dữ liệu + state vườn dùng chung
    data.ts             # Nội dung: 36 thư, câu hỏi ngày, ý tưởng hẹn, quest, shop...
    plants.ts           # Mô hình tăng trưởng thời gian thật (thuần hàm, test bằng Node)
    store.tsx           # Context + reducer; persist AsyncStorage; đồng bộ Supabase
    auth.tsx            # Supabase Auth + ghép cặp RPC
    supabase.ts         # Khởi tạo client (session lưu ở AsyncStorage)
```

- **Backend dùng lại nguyên** project Supabase của bản web (`love-couple-app`): các bảng `profiles`, `couples`, `couple_members`, `room_state` và RPC `create_couple` / `join_couple` — không cần chạy lại schema.
- State của cả khu vườn là 1 JSON lưu ở `room_state` theo `couple_id`; hai máy đồng bộ bằng cách ghi debounce (~800ms) + kênh **Supabase Broadcast** `love-room-<coupleId>` để nhận thay đổi gần như tức thì (hành động yêu thương, thư rơi, điểm game...).
- URL + anon key lấy từ biến môi trường `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (file `.env`), có sẵn giá trị dự phòng trong `extra` của `app.json`. Anon key là khóa công khai phía client (bảo vệ bằng RLS) nên nhúng trong app là đúng cách dùng.
- Tăng trưởng cây là hàm thuần theo timestamp (`lib/plants.ts`): hai máy cùng tính một kết quả, không cần server riêng.

## Kiểm chứng

```bash
npx tsc --noEmit        # typecheck — đạt
npx expo lint           # lint — đạt
npx expo-doctor         # 20/20 checks — đạt
npx expo export --platform android   # bundle Hermes thành công
npm run simulate        # giả lập tăng trưởng: Hướng Dương +25h khỏe -> giai đoạn 2 "Cây con vươn nắng"; héo -> không tăng trưởng
```

## Ghi chú

- Icon app: artwork gốc ở `assets/icon.svg` (tự vẽ: cây + trái tim), đã rasterize thành `assets/icon.png` và `assets/android-icon-foreground.png` (1024x1024) bằng `sharp` (devDependency) vì Expo/EAS yêu cầu PNG.
- Không build APK/AAB sẵn trong repo — dùng EAS như hướng dẫn trên.
