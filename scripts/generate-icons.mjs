// Sinh icon PNG cho app từ artwork gốc assets/icon.svg (repo chỉ lưu file text,
// nên PNG được tạo lại bằng lệnh này — sharp đã có trong devDependencies).
// Chạy: npm run icons
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "assets", "icon.svg");

for (const out of ["icon.png", "android-icon-foreground.png"]) {
  await sharp(src, { density: 384 })
    .resize(1024, 1024, { fit: "contain", background: { r: 255, g: 241, b: 242, alpha: 1 } })
    .png()
    .toFile(path.join(root, "assets", out));
  console.log("generated assets/" + out);
}
