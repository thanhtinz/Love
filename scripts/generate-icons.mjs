// Sinh icon PNG cho app từ artwork gốc assets/icon.svg (repo chỉ lưu file text,
// nên PNG được tạo lại bằng lệnh này — sharp đã có trong devDependencies).
// Chạy: npm run icons
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "assets", "icon.svg");

for (const out of ["icon.png", "android-icon-foreground.png"]) {
  const pipeline = sharp(src, { density: 384 })
    .resize(1024, 1024, { fit: "contain", background: { r: 255, g: 241, b: 242, alpha: 1 } });
  // icon.png là icon iOS: App Store cấm kênh alpha -> ép phẳng lên nền #fff1f2.
  // android-icon-foreground.png thì PHẢI giữ trong suốt (nền adaptive icon riêng).
  if (out === "icon.png") pipeline.flatten({ background: { r: 255, g: 241, b: 242 } });
  await pipeline
    .png()
    .toFile(path.join(root, "assets", out));
  console.log("generated assets/" + out);
}

// Icon cho thông báo Web Push (service worker public/sw.js tham chiếu tới
// /push-icon.png). Thư mục public/ được expo export sao chép ra gốc bản web,
// và lệnh icons chạy TRƯỚC export trong Vercel build command, nên file sinh
// ra ở đây kịp có mặt trong dist. File PNG là artifact — đã có trong .gitignore.
mkdirSync(path.join(root, "public"), { recursive: true });
await sharp(src, { density: 384 })
  .resize(192, 192, { fit: "contain", background: { r: 255, g: 241, b: 242, alpha: 1 } })
  .flatten({ background: { r: 255, g: 241, b: 242 } })
  .png()
  .toFile(path.join(root, "public", "push-icon.png"));
console.log("generated public/push-icon.png");
