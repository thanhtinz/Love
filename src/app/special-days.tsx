import React, { useState } from "react";
import {
  Modal, Pressable, ScrollView, Switch, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { myName, useLove } from "../lib/store";
import { success } from "../lib/feedback";
import {
  SPECIAL_DATES_CAP, SPECIAL_DATE_TITLE_MAX, formatDateVN, isValidDateKey, today, uid,
  type Birthday, type PersonId, type SpecialDate,
} from "../lib/types";
import { dayCount } from "../lib/features";
import { buildSpecialDayList, isValidDayMonth, type SpecialDayListItem } from "../lib/specialDays";
import Avatar from "../components/Avatar";
import { partnerOf, selfOf } from "../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SHADOW_FLOAT, SPACE, TYPE } from "../components/theme";
import { Medallion, ScreenHeader, s } from "../components/ui";

/**
 * NGÀY KỶ NIỆM (route Stack /special-days) — theo ảnh mẫu chủ app gửi, dựng
 * lại bằng hệ "Vườn giấy ấm":
 * - Khối tổng kết navy "Chúng mình": "Đã bên nhau N ngày" + "Bắt đầu vào
 *   {ngày}" — và SỬA NGÀY BẮT ĐẦU YÊU ngay tại đây (nơi DUY NHẤT còn sửa
 *   được ngày yêu; thẻ sửa cũ ở tab Hai đứa đã gỡ). Sửa qua SET_START_DATE
 *   như cũ nên bộ đếm ngày, giai đoạn cây và các mốc đều đi theo.
 * - Hàng avatar hai người với trái tim ở giữa.
 * - Danh sách thẻ đếm ngược do buildSpecialDayList (lib/specialDays) dựng +
 *   sắp sẵn: sắp tới (gồm "Hôm nay") trước theo số ngày còn lại, đã qua sau
 *   theo độ mới qua — sinh nhật của hai người, thẻ "Kỷ niệm yêu nhau" suy từ
 *   startDate, và các ngày đặc biệt tự thêm.
 * - Nút "+" tròn góc dưới-phải để thêm ngày đặc biệt; chạm vào thẻ ngày tự
 *   thêm để sửa/xoá; sinh nhật chỉ sửa từ thẻ sinh nhật của CHÍNH MÌNH
 *   (reducer khoá theo slot).
 */

/** Ô nhập DD/MM/YYYY -> khóa ngày (đúng pattern các màn khác); sai -> null. */
function displayToKey(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const key = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return isValidDateKey(key) ? key : null;
}

/* ================= THẺ MỘT NGÀY ================= */
function DayRowCard({ entry, onPress }: { entry: SpecialDayListItem; onPress?: () => void }) {
  if (entry.kind === "birthdayInvite") {
    return (
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Thêm sinh nhật của bạn"
        style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLOR.card, borderRadius: RADIUS.card, borderWidth: 1.8, borderStyle: "dashed", borderColor: ROLE.partner, padding: 16 }}
      >
        <Medallion icon="gift-outline" color={ROLE.partnerDark} bg={ROLE.partnerSoft} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: FONT.bold, fontSize: 15.5, color: COLOR.text }}>{entry.title}</Text>
          <Text style={[s.sub, { marginTop: 2 }]}>Để hai đứa cùng đếm ngược tới ngày của bạn.</Text>
        </View>
        <Ionicons name="add-circle" size={24} color={ROLE.partnerDark} />
      </TouchableOpacity>
    );
  }

  const icon = entry.kind === "birthday" ? "gift" : entry.kind === "anniversary" ? "heart" : "calendar";
  const iconColor = entry.kind === "anniversary" ? ROLE.shared : undefined;
  const iconBg = entry.kind === "anniversary" ? ROLE.sharedSoft : undefined;
  const body = (
    <>
      <Medallion icon={icon} color={iconColor} bg={iconBg} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={2} style={{ fontFamily: FONT.bold, fontSize: 15.5, color: COLOR.text }}>{entry.title}</Text>
        <Text style={[s.sub, { marginTop: 2 }]}>
          {entry.dateLabel}
          {entry.kind === "custom" && entry.item?.yearly ? " · lặp hằng năm" : ""}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
        {entry.isToday ? (
          <Text style={{ ...TYPE.emphasis, color: COLOR.primary }}>Hôm nay</Text>
        ) : entry.group === 0 ? (
          <>
            <Text style={{ ...TYPE.captionStrong, color: ROLE.partnerDark }}>Còn</Text>
            <Text style={{ ...TYPE.displaySm, color: ROLE.partnerDark }}>
              {entry.days}<Text style={{ fontSize: 14 }}> ngày</Text>
            </Text>
          </>
        ) : (
          <>
            <Text style={{ ...TYPE.captionStrong, color: ROLE.shared }}>Đã</Text>
            <Text style={{ ...TYPE.displaySm, color: ROLE.shared }}>
              {entry.days}<Text style={{ fontSize: 14 }}> ngày</Text>
            </Text>
          </>
        )}
      </View>
    </>
  );
  const rowStyle = {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 12,
    backgroundColor: COLOR.card, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLOR.border,
    padding: 16, ...SHADOW_FLOAT, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  };
  if (!onPress) return <View style={rowStyle}>{body}</View>;
  return (
    <TouchableOpacity onPress={onPress} style={rowStyle} accessibilityRole="button" accessibilityLabel={entry.title}>
      {body}
    </TouchableOpacity>
  );
}

/* ================= PHIẾU THÊM / SỬA NGÀY ĐẶC BIỆT ================= */
/** Remount theo id ngày (key ở nơi gọi) nên form luôn khởi tạo từ đúng ngày
 *  đang sửa. target null = thêm mới. Xoá có xác nhận ngay trong phiếu (không
 *  dùng Alert để bản web cũng chạy — tiền lệ trình xem kỷ niệm). */
function SpecialFormSheet({ target, onClose }: { target: SpecialDate | null; onClose: () => void }) {
  const { state, dispatch } = useLove();
  const me = state.currentUser;
  const [title, setTitle] = useState(target?.title ?? "");
  const [dateText, setDateText] = useState(target ? formatDateVN(target.dateKey) : formatDateVN(today()));
  const [yearly, setYearly] = useState(target?.yearly ?? true);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function save() {
    const trimmed = title.trim();
    if (!trimmed) { setError("Cho ngày này một cái tên nhé."); return; }
    const key = displayToKey(dateText);
    if (!key) { setError("Ngày chưa đúng định dạng DD/MM/YYYY hoặc không tồn tại."); return; }
    if (target) {
      dispatch({ type: "SPECIAL_UPDATE", id: target.id, title: trimmed, dateKey: key, yearly, user: me });
    } else {
      const now = new Date().toISOString();
      dispatch({
        type: "SPECIAL_ADD",
        item: { id: uid(), title: trimmed, dateKey: key, yearly, bySlot: me, addedAt: now, updatedAt: now },
        user: me,
        actor: myName(state),
      });
    }
    success();
    onClose();
  }
  function remove() {
    if (!target) return;
    dispatch({ type: "SPECIAL_REMOVE", id: target.id, user: me, actor: myName(state) });
    success();
    onClose();
  }

  return (
    <Pressable style={{ flex: 1, backgroundColor: "rgba(51,39,46,0.4)", justifyContent: "flex-end" }} onPress={onClose}>
      <Pressable
        style={{ backgroundColor: COLOR.card, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 26, ...SHADOW_FLOAT }}
        onPress={(e) => e.stopPropagation()}
      >
        <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: COLOR.border, marginBottom: 14 }} />
        <Text style={{ fontFamily: FONT.extrabold, fontSize: 17, color: COLOR.text }}>
          {target ? "Sửa ngày đặc biệt" : "Thêm ngày đặc biệt"}
        </Text>

        <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: COLOR.textSoft, marginTop: 16, marginBottom: 6 }}>
          Tên ngày (tối đa {SPECIAL_DATE_TITLE_MAX} ký tự)
        </Text>
        <TextInput
          style={s.input}
          value={title}
          onChangeText={(t) => { setTitle(t.slice(0, SPECIAL_DATE_TITLE_MAX)); setError(""); }}
          placeholder="Ví dụ: Ngày hẹn đầu tiên"
          placeholderTextColor={COLOR.textFaint}
          maxLength={SPECIAL_DATE_TITLE_MAX}
        />
        <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: COLOR.textSoft, marginTop: 12, marginBottom: 6 }}>Ngày</Text>
        <TextInput
          style={s.input}
          value={dateText}
          onChangeText={(t) => { setDateText(t); setError(""); }}
          placeholder="DD/MM/YYYY"
          placeholderTextColor={COLOR.textFaint}
          keyboardType="numbers-and-punctuation"
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.bold, fontSize: 14.5, color: COLOR.text }}>Lặp lại hằng năm</Text>
            <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textSoft, marginTop: 1 }}>
              Bật thì app đếm ngược tới ngày này mỗi năm; tắt thì chỉ tính một lần.
            </Text>
          </View>
          <Switch
            value={yearly}
            onValueChange={setYearly}
            trackColor={{ false: COLOR.track, true: COLOR.primary }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Lặp lại hằng năm"
          />
        </View>
        {error ? <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.danger, marginTop: 10 }}>{error}</Text> : null}

        {confirmDelete ? (
          <>
            <Text style={{ fontFamily: FONT.semibold, fontSize: 14.5, lineHeight: 21, color: COLOR.text, marginTop: 16 }}>
              Xoá ngày “{target?.title}”? Ngày sẽ biến mất trên máy của cả hai đứa.
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity onPress={() => setConfirmDelete(false)} style={[s.btnGhost, { flex: 1 }]} accessibilityRole="button" accessibilityLabel="Giữ lại ngày này">
                <Text style={s.btnGhostText}>Giữ lại</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={remove} style={{ flex: 1, minHeight: 48, borderRadius: RADIUS.control, backgroundColor: COLOR.danger, alignItems: "center", justifyContent: "center" }} accessibilityRole="button" accessibilityLabel="Xoá hẳn ngày này">
                <Text style={{ fontFamily: FONT.bold, fontSize: 14.5, color: "#fff" }}>Xoá hẳn</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={save} style={[s.btn, { marginTop: 18 }]} accessibilityRole="button" accessibilityLabel={target ? "Lưu ngày đặc biệt" : "Thêm ngày đặc biệt"}>
              <Ionicons name={target ? "checkmark" : "add"} size={18} color="#fff" />
              <Text style={s.btnText}>{target ? "Lưu" : "Thêm ngày"}</Text>
            </TouchableOpacity>
            {target ? (
              <TouchableOpacity onPress={() => setConfirmDelete(true)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, minHeight: 44 }} accessibilityRole="button" accessibilityLabel="Xoá ngày đặc biệt này">
                <Ionicons name="trash-outline" size={16} color={COLOR.danger} />
                <Text style={{ fontFamily: FONT.bold, fontSize: 13.5, color: COLOR.danger }}>Xoá ngày này</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </Pressable>
    </Pressable>
  );
}

/* ================= PHIẾU ĐẶT / SỬA SINH NHẬT CỦA MÌNH ================= */
/** Chỉ mở được từ thẻ sinh nhật của CHÍNH người đang đăng nhập — reducer
 *  cũng khoá cứng slot === user. Hai ô số ngày/tháng riêng (29/02 được chấp
 *  nhận; năm không nhuận thì mừng vào 28/02). */
function BirthdaySheet({ slot, initial, name, onClose }: { slot: PersonId; initial: Birthday | null; name: string; onClose: () => void }) {
  const { state, dispatch } = useLove();
  const me = state.currentUser;
  const [dayText, setDayText] = useState(initial ? String(initial.day) : "");
  const [monthText, setMonthText] = useState(initial ? String(initial.month) : "");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function save() {
    const day = Number(dayText);
    const month = Number(monthText);
    if (!isValidDayMonth(day, month)) {
      setError("Ngày/tháng chưa hợp lệ — 29/02 thì được, còn 30/02 hay 31/04 thì không tồn tại đâu.");
      return;
    }
    dispatch({ type: "BIRTHDAY_SET", slot, user: me, birthday: { day, month } });
    success();
    onClose();
  }
  function remove() {
    dispatch({ type: "BIRTHDAY_SET", slot, user: me, birthday: null });
    success();
    onClose();
  }

  return (
    <Pressable style={{ flex: 1, backgroundColor: "rgba(51,39,46,0.4)", justifyContent: "flex-end" }} onPress={onClose}>
      <Pressable
        style={{ backgroundColor: COLOR.card, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 26, ...SHADOW_FLOAT }}
        onPress={(e) => e.stopPropagation()}
      >
        <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: COLOR.border, marginBottom: 14 }} />
        <Text style={{ fontFamily: FONT.extrabold, fontSize: 17, color: COLOR.text }}>Sinh nhật của {name}</Text>
        <Text style={{ ...TYPE.body, color: COLOR.textSoft, lineHeight: 21, marginTop: 6 }}>
          Chỉ cần ngày và tháng — hai đứa sẽ cùng đếm ngược tới sinh nhật mỗi năm.
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: COLOR.textSoft, marginBottom: 6 }}>Ngày</Text>
            <TextInput
              style={s.input}
              value={dayText}
              onChangeText={(t) => { setDayText(t.replace(/[^0-9]/g, "").slice(0, 2)); setError(""); }}
              placeholder="22"
              placeholderTextColor={COLOR.textFaint}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONT.bold, fontSize: 12.5, color: COLOR.textSoft, marginBottom: 6 }}>Tháng</Text>
            <TextInput
              style={s.input}
              value={monthText}
              onChangeText={(t) => { setMonthText(t.replace(/[^0-9]/g, "").slice(0, 2)); setError(""); }}
              placeholder="07"
              placeholderTextColor={COLOR.textFaint}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>
        {error ? <Text style={{ fontFamily: FONT.regular, fontSize: 13, color: COLOR.danger, marginTop: 10 }}>{error}</Text> : null}
        {confirmDelete ? (
          <>
            <Text style={{ fontFamily: FONT.semibold, fontSize: 14.5, lineHeight: 21, color: COLOR.text, marginTop: 16 }}>
              Xoá sinh nhật của bạn? Thẻ đếm ngược sinh nhật sẽ biến mất.
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <TouchableOpacity onPress={() => setConfirmDelete(false)} style={[s.btnGhost, { flex: 1 }]} accessibilityRole="button" accessibilityLabel="Giữ lại sinh nhật">
                <Text style={s.btnGhostText}>Giữ lại</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={remove} style={{ flex: 1, minHeight: 48, borderRadius: RADIUS.control, backgroundColor: COLOR.danger, alignItems: "center", justifyContent: "center" }} accessibilityRole="button" accessibilityLabel="Xoá hẳn sinh nhật">
                <Text style={{ fontFamily: FONT.bold, fontSize: 14.5, color: "#fff" }}>Xoá hẳn</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={save} style={[s.btn, { marginTop: 18 }]} accessibilityRole="button" accessibilityLabel="Lưu sinh nhật">
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={s.btnText}>Lưu sinh nhật</Text>
            </TouchableOpacity>
            {initial ? (
              <TouchableOpacity onPress={() => setConfirmDelete(true)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, minHeight: 44 }} accessibilityRole="button" accessibilityLabel="Xoá sinh nhật của bạn">
                <Ionicons name="trash-outline" size={16} color={COLOR.danger} />
                <Text style={{ fontFamily: FONT.bold, fontSize: 13.5, color: COLOR.danger }}>Xoá sinh nhật</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </Pressable>
    </Pressable>
  );
}

/* ================= MÀN HÌNH ================= */
export default function SpecialDaysScreen() {
  const { state, dispatch } = useLove();
  const insets = useSafeAreaInsets();
  const me = state.currentUser;
  const self = selfOf(state);
  const partner = partnerOf(state);
  const count = dayCount(state.couple.startDate);

  const list = buildSpecialDayList({
    birthdays: state.birthdays,
    specialDates: state.specialDates,
    startDate: state.couple.startDate,
    loveDayCount: count,
    nameA: state.personA,
    nameB: state.personB,
    mySlot: me,
  });

  /* Sửa ngày bắt đầu yêu — NGAY trong khối tổng kết của màn này (nơi duy
   *  nhất; cùng pattern kiểm tra với thẻ cũ ở tab Hai đứa: định dạng
   *  DD/MM/YYYY + không ở tương lai, rồi SET_START_DATE như cũ). */
  const [startEditing, setStartEditing] = useState(false);
  const [startText, setStartText] = useState("");
  const [startMsg, setStartMsg] = useState("");
  const [startOk, setStartOk] = useState(false);
  function openStartEdit() {
    setStartText(formatDateVN(state.couple.startDate));
    setStartMsg("");
    setStartOk(false);
    setStartEditing(true);
  }
  function saveStartDate() {
    const key = displayToKey(startText);
    if (!key) { setStartOk(false); setStartMsg("Ngày chưa đúng định dạng DD/MM/YYYY hoặc không tồn tại."); return; }
    if (new Date(`${key}T00:00:00`).getTime() > Date.now()) { setStartOk(false); setStartMsg("Ngày bắt đầu không thể ở tương lai nhé."); return; }
    dispatch({ type: "SET_START_DATE", date: key, user: me, actor: myName(state) });
    success();
    setStartOk(true);
    setStartMsg("Đã lưu — bộ đếm ngày, cây và mọi cột mốc đều tính lại từ ngày này.");
    setStartEditing(false);
  }

  /* Phiếu thêm/sửa ngày đặc biệt: formTarget undefined = đóng; null = thêm
   * mới; SpecialDate = đang sửa ngày đó. */
  const [formOpen, setFormOpen] = useState(false);
  const [formTarget, setFormTarget] = useState<SpecialDate | null>(null);
  const [notice, setNotice] = useState("");
  function openAdd() {
    if (state.specialDates.length >= SPECIAL_DATES_CAP) {
      setNotice(`Đã có đủ ${SPECIAL_DATES_CAP} ngày đặc biệt rồi — xoá bớt một ngày để thêm ngày mới nhé.`);
      return;
    }
    setNotice("");
    setFormTarget(null);
    setFormOpen(true);
  }
  function openEdit(item: SpecialDate) {
    setNotice("");
    setFormTarget(item);
    setFormOpen(true);
  }

  const [birthdayOpen, setBirthdayOpen] = useState(false);

  return (
    <View style={s.screen}>
      <ScreenHeader title="Ngày kỷ niệm" subtitle="Sinh nhật, kỷ niệm và những ngày riêng" fallback="/(tabs)/couple" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SPACE.screenX, paddingBottom: insets.bottom + 96, paddingTop: 4, gap: SPACE.cardGap }}
        showsVerticalScrollIndicator={false}
      >
        {/* Khối tổng kết "Chúng mình" */}
        <View style={{ backgroundColor: ROLE.shared, borderRadius: RADIUS.scene, padding: 20 }}>
          <Text style={{ ...TYPE.micro, color: COLOR.onNavySoft, textAlign: "center" }}>Đã bên nhau</Text>
          <Text style={{ textAlign: "center", marginTop: 6 }}>
            <Text style={{ ...TYPE.display, color: "#fff" }}>{count}</Text>
            <Text style={{ fontFamily: FONT.bold, fontSize: 17, color: "#fff" }}> ngày</Text>
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 }}>
            <Text style={{ fontFamily: FONT.regular, fontSize: 13.5, color: COLOR.onNavySoft }}>
              Bắt đầu vào {formatDateVN(state.couple.startDate)}
            </Text>
            {!startEditing ? (
              <TouchableOpacity
                onPress={openStartEdit}
                accessibilityRole="button"
                accessibilityLabel="Sửa ngày bắt đầu yêu"
                style={{ backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 }}
              >
                <Text style={{ fontFamily: FONT.bold, fontSize: 12, color: "#fff" }}>Sửa</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {startMsg && !startEditing ? (
            <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: startOk ? COLOR.onNavySoft : "#FFC4CE", marginTop: 8, textAlign: "center" }}>
              {startMsg}
            </Text>
          ) : null}
          {startEditing ? (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.onNavySoft, lineHeight: 18, textAlign: "center" }}>
                Bộ đếm “Ngày N” tính từ ngày này — ai trong hai đứa cũng sửa được, lần sửa gần nhất là lần được tính.
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <TextInput
                  style={[s.input, { flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.3)", color: "#FFF7F0" }]}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="rgba(255,247,240,0.4)"
                  keyboardType="numbers-and-punctuation"
                  value={startText}
                  onChangeText={(t) => { setStartText(t); setStartMsg(""); }}
                />
                <TouchableOpacity onPress={saveStartDate} style={{ backgroundColor: COLOR.primary, borderRadius: RADIUS.control, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", minHeight: 48 }} accessibilityRole="button" accessibilityLabel="Lưu ngày bắt đầu yêu">
                  <Text style={{ color: "#fff", fontFamily: FONT.bold, fontSize: 14.5 }}>Lưu</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setStartEditing(false); setStartMsg(""); }} style={{ borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)", borderRadius: RADIUS.control, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", minHeight: 48 }} accessibilityRole="button" accessibilityLabel="Huỷ sửa ngày bắt đầu">
                  <Text style={{ color: "#fff", fontFamily: FONT.bold, fontSize: 14.5 }}>Huỷ</Text>
                </TouchableOpacity>
              </View>
              {startMsg ? (
                <Text style={{ fontFamily: FONT.regular, fontSize: 12.5, color: "#FFC4CE", marginTop: 8, textAlign: "center" }}>{startMsg}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Avatar hai người + trái tim ở giữa (như ảnh mẫu) */}
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "flex-start", gap: 16, paddingVertical: 4 }}>
          <View style={{ alignItems: "center", gap: 6, width: 96 }}>
            <Avatar id={self.avatar} size={64} ring={self.main} />
            <Text numberOfLines={1} style={{ fontFamily: FONT.bold, fontSize: 13.5, color: COLOR.text }}>{self.name}</Text>
          </View>
          <View style={{ height: 64, justifyContent: "center" }}>
            <Ionicons name="heart" size={30} color={COLOR.primary} />
          </View>
          <View style={{ alignItems: "center", gap: 6, width: 96 }}>
            <Avatar id={partner.avatar} size={64} ring={partner.main} />
            <Text numberOfLines={1} style={{ fontFamily: FONT.bold, fontSize: 13.5, color: COLOR.text }}>{partner.name}</Text>
          </View>
        </View>

        {notice ? (
          <View style={{ backgroundColor: COLOR.warningSoft, borderRadius: RADIUS.inner, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ fontFamily: FONT.medium, fontSize: 13, lineHeight: 19, color: COLOR.warningText }}>{notice}</Text>
          </View>
        ) : null}

        {/* Danh sách thẻ ngày */}
        <View style={{ gap: SPACE.cardGap }}>
          {list.map((entry) => {
            const press = entry.kind === "birthdayInvite" || (entry.kind === "birthday" && entry.slot === me)
              ? () => setBirthdayOpen(true)
              : entry.kind === "custom" && entry.item
                ? () => openEdit(entry.item as SpecialDate)
                : undefined;
            return <DayRowCard key={entry.key} entry={entry} onPress={press} />;
          })}
        </View>

        <Text style={{ ...TYPE.caption, color: COLOR.textFaint, textAlign: "center", lineHeight: 18, paddingHorizontal: 12 }}>
          Chạm nút + để thêm những ngày riêng của hai đứa — ngày hẹn đầu tiên, ngày tỏ tình, hay bất cứ ngày nào đáng nhớ.
        </Text>
      </ScrollView>

      {/* Nút + tròn thêm ngày đặc biệt (như ảnh mẫu) */}
      <TouchableOpacity
        onPress={openAdd}
        accessibilityRole="button"
        accessibilityLabel="Thêm ngày đặc biệt"
        style={{
          position: "absolute", right: 20, bottom: insets.bottom + 20,
          width: 58, height: 58, borderRadius: 29, backgroundColor: COLOR.primary,
          alignItems: "center", justifyContent: "center", ...SHADOW_FLOAT,
        }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        {formOpen ? (
          <SpecialFormSheet key={formTarget?.id ?? "add"} target={formTarget} onClose={() => setFormOpen(false)} />
        ) : null}
      </Modal>

      <Modal visible={birthdayOpen} transparent animationType="slide" onRequestClose={() => setBirthdayOpen(false)}>
        {birthdayOpen ? (
          <BirthdaySheet slot={me} initial={state.birthdays[me]} name={self.name} onClose={() => setBirthdayOpen(false)} />
        ) : null}
      </Modal>
    </View>
  );
}
