import React, { useEffect, useMemo, useState } from "react";
import { Platform, Switch, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../lib/auth";
import { useLove } from "../lib/store";
import type { WidgetPrefs } from "../lib/types";
import {
  buildWidgetProps, widgetInputFromState, widgetLayoutVariant, type LoveWidgetProps,
} from "../lib/widget";
import { pushPermissionGranted, registerNotePushToken } from "../lib/push";
import { PlantImage } from "./Art";
import { COLOR, FONT, RADIUS, TYPE } from "./theme";
import { s } from "./ui";

/**
 * Mục "Widget màn hình chính" trong Tài khoản:
 * - Ba công tắc RIÊNG của chính người dùng (Đếm ngày / Note của người ấy /
 *   Cây tình yêu), mặc định TẮT CẢ — lựa chọn lưu theo từng người trong state
 *   vườn (widgetPrefs, chủ slot thắng khi merge) nên mở máy nào cũng như nhau.
 *   Công tắc Note còn là CỔNG RIÊNG TƯ: tắt thì note của người ấy không rời
 *   app ra màn hình chính của mình.
 * - Xem trước trực tiếp: bản thu nhỏ vẽ bằng component RN thường, dùng ĐÚNG
 *   props + luật reflow của widget thật (lib/widget) — bật tắt là thấy widget
 *   sẽ trông thế nào.
 * - Nút bật thông báo note: xin quyền đúng ngữ cảnh + đăng ký Expo Push Token
 *   (lib/push). Chữ trung thực về độ trễ widget nằm ngay dưới xem trước.
 */

const W_INK = "#FFF6EC";
const W_SUB = "#F0C4D2";
const W_FAINT = "#C99AAB";
const W_ROSE = "#FF8FAB";
const W_GOLD = "#FFC46B";

function MiniBar({ value, gold }: { value: number; gold?: boolean }) {
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: "#FFFFFF26", overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, backgroundColor: gold ? W_GOLD : W_ROSE, borderRadius: 2 }} />
    </View>
  );
}

function MiniNote({ p, hero }: { p: LoveWidgetProps; hero?: boolean }) {
  if (!p.noteHas) {
    return (
      <View style={{ gap: 3 }}>
        <Text style={{ fontFamily: FONT.semibold, fontSize: 9, color: W_FAINT }}>Note của người ấy</Text>
        <Text numberOfLines={hero ? 4 : 2} style={{ fontFamily: FONT.regular, fontSize: hero ? 12 : 10.5, color: W_SUB }}>Chưa có note nào. Mở app để viết note đầu tiên cho người ấy nhé.</Text>
      </View>
    );
  }
  return (
    <View style={{ gap: 3 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.noteUnread ? W_ROSE : "#FFFFFF33" }} />
        <Text numberOfLines={1} style={{ fontFamily: FONT.semibold, fontSize: 9.5, color: W_GOLD, flex: 1 }}>{p.noteAuthor || "Người ấy"}</Text>
        <Text style={{ fontFamily: FONT.regular, fontSize: 8.5, color: W_FAINT }}>{p.noteRelativeTime}</Text>
      </View>
      <Text numberOfLines={hero ? 5 : 2} style={{ fontFamily: FONT.medium, fontSize: hero ? 13 : 11, color: W_INK, lineHeight: hero ? 18 : 15 }}>{hero ? p.noteText : p.noteShortText}</Text>
      {p.noteUnread ? <Text style={{ fontFamily: FONT.semibold, fontSize: 8.5, color: W_ROSE }}>Note mới chưa xem</Text> : null}
    </View>
  );
}

function MiniDay({ p, big }: { p: LoveWidgetProps; big?: boolean }) {
  return (
    <View style={{ gap: 2, alignItems: big ? "center" : "flex-start" }}>
      <Text style={{ fontFamily: FONT.semibold, fontSize: big ? 11 : 9, color: W_SUB }}>Ngày</Text>
      <Text style={{ fontFamily: FONT.black, fontSize: big ? 40 : 24, color: W_INK, lineHeight: big ? 44 : 28 }}>{p.dayCount}</Text>
      <Text numberOfLines={2} style={{ fontFamily: FONT.medium, fontSize: big ? 10.5 : 9, color: big ? W_SUB : W_FAINT, textAlign: big ? "center" : "left" }}>{big ? "bên nhau" : p.milestoneText}</Text>
      {big ? <Text numberOfLines={1} style={{ fontFamily: FONT.regular, fontSize: 8.5, color: W_FAINT }}>{p.milestoneText}</Text> : null}
      <View style={{ width: big ? 100 : "100%", marginTop: 2 }}><MiniBar value={p.dayProgress} gold={p.milestoneToday} /></View>
    </View>
  );
}

function MiniTree({ p, withTracker }: { p: LoveWidgetProps; withTracker?: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: 3, width: 104 }}>
      <PlantImage stageIndex={p.treeStage - 1} size={withTracker ? 62 : 78} />
      <Text numberOfLines={1} style={{ fontFamily: FONT.semibold, fontSize: 10, color: W_INK }}>{p.treeStageName}</Text>
      {withTracker ? (
        <>
          <View style={{ flexDirection: "row", gap: 3 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <View key={i} style={{ width: i === p.treeStage ? 6 : 4.5, height: i === p.treeStage ? 6 : 4.5, borderRadius: 3, backgroundColor: i <= p.treeStage ? W_GOLD : "#FFFFFF33" }} />
            ))}
          </View>
          <Text numberOfLines={1} style={{ fontFamily: FONT.regular, fontSize: 8.5, color: W_SUB }}>{p.daysToNextStage >= 0 ? `Còn ${p.daysToNextStage} ngày nữa cây lớn thêm` : "Cây đã trưởng thành"}</Text>
        </>
      ) : null}
    </View>
  );
}

/** Bản xem trước thu nhỏ — cùng luật reflow như widget thật. */
function WidgetPreview({ p }: { p: LoveWidgetProps }) {
  const variant = widgetLayoutVariant(p);
  return (
    <View style={{ backgroundColor: "#2A1220", borderRadius: 18, padding: 12, minHeight: 118, justifyContent: "center", overflow: "hidden" }}>
      {variant === "none" ? (
        <View style={{ alignItems: "center", gap: 5 }}>
          <Text style={{ fontFamily: FONT.bold, fontSize: 15, color: W_INK }}>Khu vườn nhỏ</Text>
          <Text style={{ fontFamily: FONT.medium, fontSize: 11, color: W_SUB, textAlign: "center" }}>Mở app → Tài khoản → Widget để chọn phần muốn hiện</Text>
          <Text style={{ fontFamily: FONT.regular, fontSize: 9, color: W_FAINT }}>Đếm ngày · Note của người ấy · Cây tình yêu</Text>
        </View>
      ) : variant === "all" ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <MiniTree p={p} withTracker />
          <View style={{ flex: 1, gap: 7 }}>
            <View style={{ backgroundColor: "#FFFFFF16", borderRadius: 10, padding: 8 }}><MiniNote p={p} /></View>
            <MiniDay p={p} />
          </View>
        </View>
      ) : variant === "noteDay" ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Text style={{ fontFamily: FONT.bold, fontSize: 12, color: W_INK }}>Ngày {p.dayCount}</Text>
            <Text numberOfLines={1} style={{ fontFamily: FONT.regular, fontSize: 9, color: W_FAINT, flex: 1 }}>{p.milestoneText}</Text>
          </View>
          <MiniNote p={p} hero />
        </View>
      ) : variant === "noteTree" ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <MiniTree p={p} withTracker />
          <View style={{ flex: 1 }}><MiniNote p={p} hero /></View>
        </View>
      ) : variant === "dayTree" ? (
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <MiniTree p={p} withTracker />
          <View style={{ flex: 1 }}><MiniDay p={p} /></View>
        </View>
      ) : variant === "note" ? (
        <View style={{ gap: 6 }}>
          <MiniNote p={p} hero />
          <Text style={{ fontFamily: FONT.regular, fontSize: 8.5, color: W_FAINT }}>Chạm để mở Note</Text>
        </View>
      ) : variant === "tree" ? (
        <View style={{ alignItems: "center" }}><MiniTree p={p} withTracker /></View>
      ) : (
        <MiniDay p={p} big />
      )}
    </View>
  );
}

const TOGGLES: { key: keyof WidgetPrefs; title: string; desc: string }[] = [
  { key: "day", title: "Đếm ngày", desc: "Ngày thứ mấy bên nhau + mốc kỷ niệm sắp tới" },
  { key: "note", title: "Note của người ấy", desc: "Note mới nhất người ấy viết cho bạn, ngay trên màn hình chính" },
  { key: "tree", title: "Cây tình yêu", desc: "Cây lớn theo số ngày yêu, đủ 7 giai đoạn" },
];

export function WidgetSettingsCard() {
  const { state, dispatch } = useLove();
  const { user } = useAuth();
  const me = state.currentUser;
  const prefs = state.widgetPrefs[me];
  const props = useMemo(() => buildWidgetProps(widgetInputFromState(state, me)), [state, me]);

  const [pushGranted, setPushGranted] = useState<boolean | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  useEffect(() => { let live = true; pushPermissionGranted().then((g) => { if (live) setPushGranted(g); }); return () => { live = false; }; }, []);

  async function enablePush() {
    if (!user || pushBusy) return;
    setPushBusy(true); setPushMsg("");
    const res = await registerNotePushToken(user.id);
    if (res.ok) { setPushGranted(true); setPushMsg("Đã bật — note mới của người ấy sẽ có thông báo ngay."); }
    else setPushMsg(res.message);
    setPushBusy(false);
  }

  return (
    <View style={s.card}>
      <Text style={{ ...TYPE.micro, color: COLOR.textSoft }}>Widget màn hình chính</Text>
      <Text style={{ fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.textSoft, lineHeight: 19, marginTop: 8 }}>
        Chọn phần bạn muốn thấy trên widget ở màn hình chính điện thoại. Lựa chọn là của riêng bạn — người ấy tự chọn cho widget của họ.
      </Text>

      <View style={{ marginTop: 14, gap: 2 }}>
        {TOGGLES.map((t) => (
          <View key={t.key} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.bold, fontSize: 14.5, color: COLOR.text }}>{t.title}</Text>
              <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textSoft, marginTop: 1 }}>{t.desc}</Text>
            </View>
            <Switch
              value={prefs[t.key]}
              onValueChange={(v) => dispatch({ type: "WIDGET_PREFS_SET", user: me, prefs: { [t.key]: v } })}
              trackColor={{ false: COLOR.track, true: COLOR.primary }}
              thumbColor="#FFFFFF"
              accessibilityLabel={`Hiện ${t.title} trên widget`}
            />
          </View>
        ))}
      </View>

      <Text style={{ fontFamily: FONT.semibold, fontSize: 12.5, color: COLOR.textSoft, marginTop: 10, marginBottom: 6 }}>Xem trước widget của bạn</Text>
      <WidgetPreview p={props} />
      <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textSoft, lineHeight: 18, marginTop: 8 }}>
        Note mới sẽ hiện trên widget trong ít phút; thông báo thì đến ngay.
      </Text>
      <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textSoft, lineHeight: 18, marginTop: 4 }}>
        Thêm widget: chạm giữ màn hình chính → chọn Widget → tìm “Khu Vườn Tình Yêu”.
      </Text>

      {Platform.OS !== "web" ? (
        <View style={{ marginTop: 12 }}>
          {pushGranted ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontFamily: FONT.semibold, fontSize: 13.5, color: COLOR.successText, flex: 1 }}>Đã bật thông báo note</Text>
              <TouchableOpacity onPress={enablePush} disabled={pushBusy} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.control, backgroundColor: COLOR.primarySoft }} accessibilityRole="button" accessibilityLabel="Đăng ký lại mã thông báo">
                <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: COLOR.primaryDark }}>{pushBusy ? "Đang đăng ký..." : "Đăng ký lại"}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[s.btn, { opacity: pushBusy ? 0.6 : 1 }]} onPress={enablePush} disabled={pushBusy} accessibilityRole="button" accessibilityLabel="Bật thông báo note">
              <Text style={s.btnText}>{pushBusy ? "Đang bật..." : "Bật thông báo note"}</Text>
            </TouchableOpacity>
          )}
          {pushMsg ? <Text style={{ marginTop: 8, fontFamily: FONT.regular, fontSize: 13, color: pushGranted ? COLOR.successText : COLOR.danger }}>{pushMsg}</Text> : null}
        </View>
      ) : (
        <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textFaint, marginTop: 10 }}>
          Bạn đang xem bản web — widget màn hình chính nằm trong app trên điện thoại; thông báo trên trình duyệt này xem ở mục ngay bên dưới.
        </Text>
      )}
    </View>
  );
}
