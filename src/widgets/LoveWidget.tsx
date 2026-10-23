/**
 * Stub của widget cho WEB (và mọi nền tảng không có widget gốc): Metro chọn
 * file này thay cho LoveWidget.ios.tsx / LoveWidget.android.tsx khi bundle
 * web — bản web KHÔNG được kéo @expo/ui hay expo-widgets vào bundle.
 * lib/widgetSync.ts nạp widget bằng require có guard + Platform check nên
 * trên web nó không bao giờ chạm tới file này; export null chỉ để việc phân
 * giải module (Metro + tsc) luôn có đích đến an toàn.
 */
export default null;
