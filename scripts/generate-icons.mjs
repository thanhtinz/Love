// Sinh icon PNG cho app từ TRANH VẼ gốc assets/icon-logo.webp.b64 (logo "hai
// mầm thành tim" — tranh gouache do chủ app chọn; repo chỉ lưu file text nên
// tranh được giữ dạng .b64 giống pipeline assets/art, PNG là artifact sinh lại
// bằng lệnh này — sharp đã có trong devDependencies).
// Chạy: npm run icons
import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rawB64 = readFileSync(path.join(root, "assets", "icon-logo.webp.b64"), "utf8").replace(/\s/g, "");
const srcBuf = Buffer.from(rawB64, "base64");

// Màu kem nền của tranh (lấy mẫu trực tiếp từ tranh: vùng nền trên-trái
// #F8E7C9, trên-giữa #FAECD2) — trùng với android.adaptiveIcon.backgroundColor
// và nền splash trong app.json để icon/splash liền một tông.
const CREAM = { r: 250, g: 236, b: 210, alpha: 1 };

// Tranh gốc có 4 góc bo tròn trên nền TRẮNG của khung sinh ảnh — nếu giữ
// nguyên, icon sẽ có 4 vệt trắng ở góc. Vá tại nguồn: pixel gần-trắng nằm
// trong vùng góc (300px mỗi góc) được thay bằng màu kem nền của tranh, để
// mọi đầu ra (icon tràn viền, foreground adaptive, push icon) đều sạch.
async function cleanedSource() {
  const { data, info } = await sharp(srcBuf).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const R = 300;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inCorner = (x < R || x >= W - R) && (y < R || y >= H - R);
      if (!inCorner) continue;
      const i = (y * W + x) * C;
      if (data[i] >= 245 && data[i + 1] >= 245 && data[i + 2] >= 245) {
        data[i] = CREAM.r; data[i + 1] = CREAM.g; data[i + 2] = CREAM.b;
      }
    }
  }
  return sharp(data, { raw: { width: W, height: H, channels: C } }).png().toBuffer();
}
const cleanBuf = await cleanedSource();

// icon.png (iOS + splash dùng chung file này): tranh là nền kem đặc, cắt
// "cover" tràn viền 1024x1024 — không còn góc trắng do tranh bo góc, và
// App Store cấm kênh alpha nên ép phẳng (tranh vốn không có alpha).
await sharp(cleanBuf)
  .resize(1024, 1024, { fit: "cover", position: "centre" })
  .flatten({ background: CREAM })
  .png()
  .toFile(path.join(root, "assets", "icon.png"));
console.log("generated assets/icon.png");

// android-icon-foreground.png: adaptive icon cần TRONG SUỐT quanh tranh —
// đặt tranh ở ~80% giữa một khung 1024 trong suốt; nền kem do
// android.adaptiveIcon.backgroundColor trong app.json đảm nhiệm (#FAECD2).
const fgSize = Math.round(1024 * 0.8);
const fgBuf = await sharp(cleanBuf)
  .resize(fgSize, fgSize, { fit: "cover", position: "centre" })
  .png()
  .toBuffer();
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: fgBuf, gravity: "centre" }])
  .png()
  .toFile(path.join(root, "assets", "android-icon-foreground.png"));
console.log("generated assets/android-icon-foreground.png");

// Icon cho thông báo Web Push (service worker public/sw.js tham chiếu tới
// /push-icon.png). Thư mục public/ được expo export sao chép ra gốc bản web,
// và lệnh icons chạy TRƯỚC export trong Vercel build command, nên file sinh
// ra ở đây kịp có mặt trong dist. File PNG là artifact — đã có trong .gitignore.
mkdirSync(path.join(root, "public"), { recursive: true });
await sharp(cleanBuf)
  .resize(192, 192, { fit: "cover", position: "centre" })
  .flatten({ background: CREAM })
  .png()
  .toFile(path.join(root, "public", "push-icon.png"));
console.log("generated public/push-icon.png");
