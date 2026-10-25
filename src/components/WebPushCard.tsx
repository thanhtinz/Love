import React, { useEffect, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../lib/auth";
import {
  enableWebPush, getWebPushStatus, isIosNeedingHomeScreen, type WebPushStatus,
} from "../lib/webpush";
import { COLOR, FONT, RADIUS, TYPE } from "./theme";
import { s } from "./ui";

/**
 * Mục "Thông báo trên trình duyệt này" trong Tài khoản — CHỈ hiện trên bản
 * web (native trả null; app điện thoại dùng đường Expo Push trong thẻ
 * Widget ở trên).
 *
 * Web Push là đăng ký của TỪNG trình duyệt/thiết bị: bật ở Chrome trên máy
 * tính thì chỉ máy đó nhận; điện thoại muốn nhận thì mở web trên điện thoại
 * và bật riêng tại đó. Trạng thái đọc trực tiếp từ trình duyệt
 * (lib/webpush.ts) nên luôn nói thật chiếc máy đang cầm, không suy đoán.
 */
export function WebPushCard() {
  const { user } = useAuth();
  const [status, setStatus] = useState<WebPushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let live = true;
    getWebPushStatus().then((st) => { if (live) setStatus(st); });
    return () => { live = false; };
  }, []);

  if (Platform.OS !== "web") return null;

  async function enable() {
    if (!user || busy) return;
    setBusy(true); setMsg("");
    const res = await enableWebPush(user.id);
    if (res.ok) {
      setStatus("subscribed");
      setMsg("Đã bật — note mới và nhịp nhớ của người ấy sẽ hiện thông báo trên trình duyệt này, kể cả khi bạn đã đóng tab.");
    } else {
      setMsg(res.message);
      getWebPushStatus().then(setStatus);
    }
    setBusy(false);
  }

  // iPhone/iPad ở tab Safari thường: PushManager chưa tồn tại — gợi ý thêm
  // vào màn hình chính ngay trong thẻ, trước cả khi bấm nút.
  let iosHint = false;
  try {
    const nav = (globalThis as { navigator?: { userAgent?: string; standalone?: boolean } }).navigator;
    const mm = (globalThis as { matchMedia?: (q: string) => { matches: boolean } }).matchMedia;
    const standalone = nav?.standalone === true || Boolean(mm && mm("(display-mode: standalone)").matches);
    iosHint = isIosNeedingHomeScreen(nav?.userAgent ?? "", standalone);
  } catch { /* không phải trình duyệt thật — bỏ qua */ }

  return (
    <View style={s.card}>
      <Text style={{ ...TYPE.micro, color: COLOR.textSoft }}>Thông báo trên trình duyệt này</Text>
      <Text style={{ fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.textSoft, lineHeight: 19, marginTop: 8 }}>
        Bật để nhận thông báo note và nhịp nhớ ngay trên trình duyệt này, kể cả khi đã đóng tab.
        Mỗi trình duyệt/thiết bị bật riêng một lần — điện thoại muốn nhận thì mở bản web trên điện thoại và bật tại đây.
      </Text>

      {iosHint ? (
        <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.text, lineHeight: 19, marginTop: 10 }}>
          Trên iPhone/iPad: hãy thêm trang vào màn hình chính trước nhé (nút Chia sẻ -&gt; Thêm vào màn hình chính), rồi mở app từ biểu tượng đó và quay lại đây bật thông báo.
        </Text>
      ) : null}

      <View style={{ marginTop: 12 }}>
        {status === null ? (
          <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.textFaint }}>Đang kiểm tra trình duyệt này...</Text>
        ) : status === "subscribed" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontFamily: FONT.semibold, fontSize: 13.5, color: COLOR.successText, flex: 1 }}>Đã bật trên trình duyệt này</Text>
            <TouchableOpacity onPress={enable} disabled={busy} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.control, backgroundColor: COLOR.primarySoft }} accessibilityRole="button" accessibilityLabel="Đăng ký lại thông báo trình duyệt">
              <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: COLOR.primaryDark }}>{busy ? "Đang đăng ký..." : "Đăng ký lại"}</Text>
            </TouchableOpacity>
          </View>
        ) : status === "unsupported" ? (
          <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.textFaint, lineHeight: 19 }}>
            Trình duyệt này chưa hỗ trợ thông báo đẩy.
          </Text>
        ) : (
          <>
            <TouchableOpacity style={[s.btn, { opacity: busy ? 0.6 : 1 }]} onPress={enable} disabled={busy} accessibilityRole="button" accessibilityLabel="Bật thông báo trên trình duyệt này">
              <Text style={s.btnText}>{busy ? "Đang bật..." : "Bật thông báo trên trình duyệt này"}</Text>
            </TouchableOpacity>
            {status === "denied" ? (
              <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textSoft, lineHeight: 18, marginTop: 8 }}>
                Trình duyệt đang chặn thông báo của trang này — mở cài đặt trang web (biểu tượng ổ khoá trên thanh địa chỉ) -&gt; Thông báo -&gt; Cho phép, rồi bấm bật lại nhé.
              </Text>
            ) : null}
          </>
        )}
        {msg ? (
          <Text style={{ marginTop: 8, fontFamily: FONT.regular, fontSize: 13, color: msg.startsWith("Đã bật") ? COLOR.successText : COLOR.danger }}>{msg}</Text>
        ) : null}
      </View>
    </View>
  );
}
