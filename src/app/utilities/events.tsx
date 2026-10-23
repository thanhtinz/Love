import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { countdownLabel, upcomingEvents } from "../../lib/features";
import { EVENT_TITLE_MAX, EVENTS_MAX, isValidDateKey, parseDateKey, today, uid, type SpecialEvent } from "../../lib/types";
import { PersonChip } from "../../components/PersonChip";
import { MascotArt, MemoriesEmptyArt } from "../../components/Art";
import { COLOR, FONT, RADIUS } from "../../components/theme";
import { ClosingBand, ScreenHeader, Segmented, StatusChip, s } from "../../components/ui";

/**
 * Màn Ngày đặc biệt (hub Tiện ích) — kế hoạch Hạng 5: danh sách sự kiện chung
 * (kỷ niệm, sinh nhật, chuyến đi...) kèm đếm ngược. Sự kiện gần nhất còn hiện
 * 1 dòng đếm ngược ở hồ sơ hub Hai đứa và ở Trang chủ.
 * Khóa cứng nằm ở reducer (trần 50, tiêu đề <= 60 ký tự, tombstone khi xoá);
 * màn này chỉ validate trình bày + xác nhận trước khi xoá.
 */

const fmtDate = (key: string) => {
  const d = parseDateKey(key);
  return d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` : key;
};

export default function EventsScreen() {
  const { state, dispatch } = useLove();
  const me = state.currentUser;
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [repeat, setRepeat] = useState<"once" | "yearly">("once");
  const [err, setErr] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const upcoming = upcomingEvents(state.events);
  const upcomingIds = new Set(upcoming.map((u) => u.event.id));
  const past = state.events.filter((e) => !upcomingIds.has(e.id));

  function openAdd() {
    setEditingId(null); setTitle(""); setDate(""); setRepeat("once"); setErr(""); setFormOpen(true);
  }
  function openEdit(ev: SpecialEvent) {
    setEditingId(ev.id); setTitle(ev.title); setDate(ev.date); setRepeat(ev.repeat); setErr(""); setFormOpen(true);
  }
  function submit() {
    const t = title.trim();
    if (!t) { setErr("Nhập tên ngày đặc biệt trước nhé."); return; }
    if (t.length > EVENT_TITLE_MAX) { setErr(`Tên tối đa ${EVENT_TITLE_MAX} ký tự.`); return; }
    if (!isValidDateKey(date.trim())) { setErr("Ngày chưa đúng định dạng yyyy-mm-dd hoặc không tồn tại."); return; }
    if (!editingId && date.trim() < today() && repeat === "once") { setErr("Ngày này đã qua rồi — chọn lặp hằng năm nếu muốn đếm ngược tới năm sau nhé."); return; }
    const nowIso = new Date().toISOString();
    if (editingId) {
      const cur = state.events.find((e) => e.id === editingId);
      if (cur) dispatch({ type: "EVENT_EDIT", event: { ...cur, title: t, date: date.trim(), repeat } });
    } else {
      dispatch({ type: "EVENT_ADD", event: { id: uid(), title: t, date: date.trim(), repeat, createdBy: me, createdAt: nowIso, updatedAt: nowIso } });
    }
    setFormOpen(false); setEditingId(null); setErr("");
  }

  const row = (ev: SpecialEvent, daysUntil: number | null) => (
    <View key={ev.id} style={{ flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#fff", borderRadius: RADIUS.inner, borderWidth: 1, borderColor: COLOR.border, paddingVertical: 11, paddingHorizontal: 13 }}>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={{ fontFamily: FONT.bold, fontSize: 15, lineHeight: 20, color: COLOR.text }} numberOfLines={2}>{ev.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Text style={s.sub}>{fmtDate(ev.date)}{ev.repeat === "yearly" ? " · lặp hằng năm" : ""}</Text>
          <PersonChip state={state} slot={ev.createdBy} size={18} showYouTag={false} />
        </View>
      </View>
      {daysUntil !== null && (
        <StatusChip label={countdownLabel(daysUntil)} variant={daysUntil <= 7 ? "accent" : "info"} />
      )}
      {confirmDel === ev.id ? (
        <View style={{ flexDirection: "row", gap: 6, flexShrink: 0 }}>
          <TouchableOpacity onPress={() => { dispatch({ type: "EVENT_DEL", id: ev.id }); setConfirmDel(null); }} style={{ backgroundColor: COLOR.danger, borderRadius: RADIUS.pill, paddingVertical: 7, paddingHorizontal: 11 }} accessibilityLabel="Xác nhận xoá">
            <Text style={{ color: "#fff", fontFamily: FONT.bold, fontSize: 12 }}>Xoá hẳn</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setConfirmDel(null)} style={{ backgroundColor: COLOR.track, borderRadius: RADIUS.pill, paddingVertical: 7, paddingHorizontal: 11 }} accessibilityLabel="Huỷ xoá">
            <Text style={{ fontFamily: FONT.bold, fontSize: 12, color: COLOR.text }}>Huỷ</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 2, flexShrink: 0 }}>
          <TouchableOpacity onPress={() => openEdit(ev)} style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }} accessibilityLabel={`Sửa ${ev.title}`}>
            <Ionicons name="create-outline" size={19} color={COLOR.textSoft} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setConfirmDel(ev.id)} style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }} accessibilityLabel={`Xoá ${ev.title}`}>
            <Ionicons name="trash-outline" size={19} color={COLOR.danger} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={s.screen}>
      <ScreenHeader fallback="/utilities" title="Ngày đặc biệt" subtitle="Đếm ngược những ngày quan trọng của hai đứa" />
      <ScrollView contentContainerStyle={s.scroll}>
        {formOpen ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>{editingId ? "Sửa ngày đặc biệt" : "Thêm ngày đặc biệt"}</Text>
            <TextInput style={[s.input, { marginTop: 13 }]} value={title} onChangeText={setTitle} placeholder="Tên ngày đặc biệt (vd: Sinh nhật gà con)" placeholderTextColor={COLOR.textFaint} maxLength={EVENT_TITLE_MAX + 10} accessibilityLabel="Tên ngày đặc biệt" />
            <TextInput style={[s.input, { marginTop: 10 }]} value={date} onChangeText={setDate} placeholder="Ngày: yyyy-mm-dd (vd 2026-12-24)" placeholderTextColor={COLOR.textFaint} accessibilityLabel="Ngày diễn ra" />
            <View style={{ marginTop: 12 }}>
              <Segmented options={[{ id: "once", label: "Một lần" }, { id: "yearly", label: "Lặp hằng năm" }]} value={repeat} onChange={setRepeat} />
            </View>
            {err ? <Text style={{ fontFamily: FONT.semibold, fontSize: 13, color: COLOR.danger, marginTop: 10 }}>{err}</Text> : null}
            <View style={{ flexDirection: "row", gap: 9, marginTop: 14 }}>
              <TouchableOpacity style={[s.btnGhost, { flex: 1 }]} onPress={() => { setFormOpen(false); setEditingId(null); }}>
                <Text style={s.btnGhostText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={submit}>
                <Text style={s.btnText}>{editingId ? "Lưu thay đổi" : "Thêm ngày"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={s.btn} onPress={openAdd} accessibilityLabel="Thêm ngày đặc biệt">
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.btnText}>Thêm ngày đặc biệt</Text>
          </TouchableOpacity>
        )}

        {state.events.length === 0 && !formOpen ? (
          /* Trạng thái trống CÓ KHUNG: tranh + tiêu đề + một câu + nút thêm ở
             trên là CTA thật của màn — không còn hụt hơi ở góc trên nữa. */
          <View style={{ alignItems: "center", backgroundColor: COLOR.surfaceSoft, borderRadius: RADIUS.card, borderWidth: 1, borderColor: COLOR.border, paddingVertical: 24, paddingHorizontal: 20, gap: 6 }}>
            <MemoriesEmptyArt size={110} />
            <Text style={{ fontFamily: FONT.extrabold, fontSize: 16.5, color: COLOR.text, textAlign: "center" }}>Chưa có ngày đặc biệt nào</Text>
            <Text style={[s.sub, { textAlign: "center", lineHeight: 19 }]}>Thêm kỷ niệm, sinh nhật hay chuyến đi sắp tới — app sẽ đếm ngược cùng hai đứa.</Text>
          </View>
        ) : (
          <View style={{ gap: 9 }}>
            <Text style={{ fontFamily: FONT.extrabold, fontSize: 16, color: COLOR.text }}>Sắp tới</Text>
            {upcoming.length === 0 && <Text style={s.sub}>Chưa có ngày đặc biệt nào sắp tới — thêm kỷ niệm, sinh nhật hay chuyến đi sắp tới nhé.</Text>}
            {upcoming.map((u) => row(u.event, u.daysUntil))}
          </View>
        )}

        {past.length > 0 && (
          <View style={{ gap: 9 }}>
            <Text style={{ fontFamily: FONT.extrabold, fontSize: 16, color: COLOR.text }}>Đã qua</Text>
            {past.map((ev) => row(ev, null))}
          </View>
        )}

        <Text style={[s.small, { textAlign: "center" }]}>Đang có {state.events.length}/{EVENTS_MAX} ngày đặc biệt · Người tạo: {myName(state)} · Sự kiện gần nhất sẽ hiện đếm ngược ở hub Hai đứa và Trang chủ.</Text>
        <ClosingBand art={<MascotArt size={72} />} line="Ngày đặc biệt gần nhất luôn có một dòng đếm ngược ở hub Hai đứa và Trang chủ — để hai đứa không lỡ dịp nào của nhau." />
      </ScrollView>
    </View>
  );
}
