/* ============================================================================
 * Service worker cho WEB PUSH của Khu Vườn Tình Yêu (bản web).
 *
 * File này sống ở thư mục public/ — `npx expo export --platform web` tự sao
 * chép mọi file trong public/ ra GỐC của bản xuất (dist/sw.js), để trình
 * duyệt đăng ký được worker ở đường dẫn /sw.js với phạm vi toàn trang.
 * (Đã kiểm chứng trực tiếp với Expo SDK 58: export xong là có dist/sw.js.)
 *
 * Việc của worker chỉ có một: nhận sự kiện `push` từ máy chủ push của trình
 * duyệt (nội dung đã được edge function mã hoá theo RFC 8291) rồi hiện thông
 * báo hệ thống — kể cả khi tab đã đóng. Payload do server gửi là JSON:
 *   { title, body, type: "note" | "heartbeat", url }
 * Chạm vào thông báo: tập trung vào cửa sổ app đang mở (điều hướng tới url
 * nếu cần) hoặc mở cửa sổ mới.
 * ==========================================================================*/

var FALLBACK_TITLE = "Khu Vườn Tình Yêu";
var ICON_URL = "/push-icon.png";

self.addEventListener("install", function () {
  // Kích hoạt ngay bản worker mới, không chờ các tab cũ đóng hết.
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  // Nhận quyền điều khiển các tab đang mở ngay trong lần đầu cài đặt.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  var payload = {};
  if (event.data) {
    try {
      payload = event.data.json() || {};
    } catch (e) {
      try { payload = { body: event.data.text() }; } catch (e2) { payload = {}; }
    }
  }
  var title = typeof payload.title === "string" && payload.title ? payload.title : FALLBACK_TITLE;
  var options = {
    body: typeof payload.body === "string" ? payload.body : "",
    icon: ICON_URL,
    badge: ICON_URL,
    tag: typeof payload.type === "string" && payload.type ? payload.type : "love",
    data: {
      url: typeof payload.url === "string" && payload.url ? payload.url : "/",
      type: typeof payload.type === "string" ? payload.type : "",
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (windows) {
        for (var i = 0; i < windows.length; i++) {
          var client = windows[i];
          if ("focus" in client) {
            return client.focus().then(function (focused) {
              var win = focused || client;
              if (target !== "/" && "navigate" in win) {
                return win.navigate(target).catch(function () { return undefined; });
              }
              return undefined;
            });
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
