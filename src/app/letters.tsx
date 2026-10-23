import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useLove, myName } from "../lib/store";
import { LOVE_MESSAGES, type LoveMessage } from "../lib/data";
import type { LoveLetter } from "../lib/types";
import { LetterEnvelopeImage, MailboxArt } from "../components/Art";
import Avatar from "../components/Avatar";
import { partnerOf, selfOf } from "../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SPACE, TYPE } from "../components/theme";
import { ClosingBand, LoadMoreRow, ScreenHeader, SkeletonCard, Stamp, s } from "../components/ui";

/**
 * Trang Thư đã lưu — route Stack gốc /letters (KHÔNG còn là tab: user chốt thư chỉ
 * là tính năng phụ 2026-10-23; lối vào duy nhất là hàng "Thư đã lưu" ở hub Hai đứa,
 * cộng thẻ thư rơi trong Vườn dẫn thẳng tới đây). Tuyệt đối không khai báo lại
 * trong (tabs) dạng tab ẩn — bẫy expo-router 58 đã sửa ở ac9208e.
 * TRANG LƯU TRỮ đơn giản (chỉ đạo của user 2026-10-23: thư chỉ là tin nhắn
 * phụ rơi ra khi chăm cây, màn này chỉ để LƯU và ĐỌC LẠI — không phải một tính năng
 * có hệ thống riêng). Vì vậy bản này CHỈ có:
 * - Một dòng đếm lưu trữ trơn ("Hộp thư đang lưu N lá thư") — không thanh tiến độ,
 *   không khung "sưu tập"/mục tiêu, không lọc độ hiếm, không lưới bộ sưu tập.
 * - MỘT danh sách duy nhất hai nhóm "Thư chưa mở" / "Đã mở"; chạm để đọc/đọc lại
 *   trong sheet giấy thư. Phong bì vẽ thật là hoạ tiết yên tĩnh của trang.
 * Dữ liệu/hành vi giữ nguyên 100%: thư vẫn rơi khi chăm cây, mở thư vẫn nhận thưởng,
 * state letterCollection vẫn được duy trì ở tầng dữ liệu (chỉ là không còn trưng bày
 * thành "bộ sưu tập" nữa).
 */

/** Hộp thư rút gọn: thư chưa mở hiện 3 lá đầu (mỗi lần +5), thư đã mở hiện 5 (mỗi lần +10). */
const UNOPENED_FIRST = 3;
const UNOPENED_STEP = 5;
const OPENED_FIRST = 5;
const OPENED_STEP = 10;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Giờ thân thiện kiểu mockup: "Sáng nay · 08:12" / "Tối qua · 21:03" / "12/10 · 18:40". */
function friendlyTime(iso: string): string {
  const d = new Date(iso);
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const dayMs = 86400000;
  const startOf = (t: number) => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const diffDays = Math.round((startOf(Date.now()) - startOf(d.getTime())) / dayMs);
  if (diffDays === 0) {
    const h = d.getHours();
    return `${h < 12 ? "Sáng nay" : h < 18 ? "Chiều nay" : "Tối nay"} · ${hm}`;
  }
  if (diffDays === 1) return `${d.getHours() >= 18 ? "Tối qua" : "Hôm qua"} · ${hm}`;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} · ${hm}`;
}

type MailRow =
  | { kind: "head-unopened"; count: number }
  | { kind: "featured"; letter: LoveLetter }
  | { kind: "unopened"; letter: LoveLetter }
  | { kind: "empty-unopened" }
  | { kind: "loadmore-unopened"; remaining: number }
  | { kind: "head-opened"; count: number }
  | { kind: "opened"; letter: LoveLetter }
  | { kind: "empty-opened" }
  | { kind: "loadmore-opened"; remaining: number };

interface Reading { letter: LoveLetter; msg: LoveMessage }

export default function LettersScreen() {
  const { state, dispatch, hydrated } = useLove();
  const [reading, setReading] = useState<Reading | null>(null);
  const [unopenedLimit, setUnopenedLimit] = useState(UNOPENED_FIRST);
  const [openedLimit, setOpenedLimit] = useState(OPENED_FIRST);
  const meName = myName(state);
  const meP = selfOf(state);
  const partnerP = partnerOf(state);

  const unopened = useMemo(() => state.letters.filter((l) => !l.opened), [state.letters]);
  const opened = useMemo(() => state.letters.filter((l) => l.opened), [state.letters]);

  const openLetter = useCallback((l: LoveLetter) => {
    const found = LOVE_MESSAGES.find((m) => m.id === Number(l.messageId));
    // Thư có messageId không còn tồn tại trong dữ liệu mẫu (dữ liệu cũ/hỏng): bản cũ
    // return lặng lẽ — lá thư thành HÀNG CHẾT, bấm không mở được, không nhận thưởng
    // được, kẹt "chưa mở" mãi. Nay vẫn cho mở với nội dung dự phòng + vẫn nhận thưởng.
    const msg: LoveMessage = found ?? { id: 0, rarity: l.rarity, text: "Lá thư này đến từ những ngày đầu của khu vườn — nội dung gốc không còn nữa, nhưng tình cảm trong đó thì vẫn nguyên vẹn." };
    // Gửi kèm SLOT người mở: openedBy là TÊN hiển thị (có thể trùng/đổi) — UI ưu tiên slot.
    if (!l.opened) dispatch({ type: "OPEN_LETTER", id: l.id, opener: meName, openerSlot: state.currentUser });
    setReading({ letter: { ...l, opened: true }, msg });
  }, [dispatch, meName, state.currentUser]);

  const rows = useMemo<MailRow[]>(() => {
    const r: MailRow[] = [{ kind: "head-unopened", count: unopened.length }];
    if (unopened.length === 0) r.push({ kind: "empty-unopened" });
    else {
      // Lá mới nhất chưa mở = thẻ thư nổi bật (đúng mockup); các lá còn lại là hàng gọn.
      const shown = unopened.slice(0, unopenedLimit);
      shown.forEach((l, i) => r.push(i === 0 ? { kind: "featured", letter: l } : { kind: "unopened", letter: l }));
      if (unopened.length > unopenedLimit) r.push({ kind: "loadmore-unopened", remaining: unopened.length - unopenedLimit });
    }
    r.push({ kind: "head-opened", count: opened.length });
    if (opened.length === 0) r.push({ kind: "empty-opened" });
    else {
      opened.slice(0, openedLimit).forEach((l) => r.push({ kind: "opened", letter: l }));
      if (opened.length > openedLimit) r.push({ kind: "loadmore-opened", remaining: opened.length - openedLimit });
    }
    return r;
  }, [unopened, opened, unopenedLimit, openedLimit]);

  const renderRow = useCallback(({ item }: { item: MailRow }) => {
    switch (item.kind) {
      case "head-unopened":
        return (
          <View style={styles.groupHead}>
            <Text style={styles.groupTitle}>Thư chưa mở</Text>
            <Text style={s.sub}>{item.count > 0 ? `${item.count} lá đang chờ` : ""}</Text>
          </View>
        );
      case "head-opened":
        return (
          <View style={[styles.groupHead, { marginTop: 14 }]}>
            <Text style={styles.groupTitle}>Đã mở</Text>
            <Text style={s.sub}>{item.count > 0 ? "Những lá thư hai đứa đã đọc" : ""}</Text>
          </View>
        );
      case "empty-unopened":
        return (
          <View style={{ alignItems: "center", gap: 4, backgroundColor: COLOR.letterPaper, borderWidth: 1, borderColor: COLOR.letterLineSoft, borderRadius: RADIUS.inner, paddingVertical: 18, paddingHorizontal: 16 }}>
            <MailboxArt size={84} />
            <Text style={{ fontFamily: FONT.bold, fontSize: 14.5, color: COLOR.text }}>Hộp thư đang trống</Text>
            <Text style={[s.sub, { textAlign: "center" }]}>Chưa có thư mới — chăm cây để thư rơi nhé.</Text>
          </View>
        );
      case "empty-opened":
        return (
          <View style={{ alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: COLOR.border, borderRadius: RADIUS.inner, paddingVertical: 14, paddingHorizontal: 16 }}>
            <Text style={s.sub}>Chưa mở lá thư nào.</Text>
          </View>
        );
      case "loadmore-unopened":
        return <LoadMoreRow onPress={() => setUnopenedLimit((v) => v + UNOPENED_STEP)} label={`Xem thêm thư chưa mở (${item.remaining} còn lại)`} />;
      case "loadmore-opened":
        return <LoadMoreRow onPress={() => setOpenedLimit((v) => v + OPENED_STEP)} label={`Xem thêm thư đã mở (${item.remaining} còn lại)`} />;
      case "featured": {
        const l = item.letter;
        return (
          <View style={styles.featured}>
            <View style={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}>
              <Stamp rarity={l.rarity} />
            </View>
            <LetterEnvelopeImage size={132} />
            <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: COLOR.text, marginTop: 6 }}>Từ {l.source}</Text>
            <Text style={{ ...TYPE.caption, color: COLOR.textSoft, marginTop: 2 }}>{friendlyTime(l.droppedAt)}</Text>
            <TouchableOpacity style={[s.btn, { alignSelf: "stretch", marginTop: 13 }]} onPress={() => openLetter(l)} accessibilityLabel="Mở thư">
              <Text style={s.btnText}>Mở thư</Text>
            </TouchableOpacity>
          </View>
        );
      }
      case "unopened": {
        const l = item.letter;
        return (
          <TouchableOpacity style={styles.unopenedRow} onPress={() => openLetter(l)} accessibilityLabel={`Mở thư từ ${l.source}`}>
            <LetterEnvelopeImage size={52} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: FONT.bold, fontSize: 14, color: COLOR.text }} numberOfLines={1}>Từ {l.source}</Text>
              <Text style={{ ...TYPE.caption, color: COLOR.textSoft, marginTop: 1 }}>{friendlyTime(l.droppedAt)}</Text>
            </View>
            <Stamp rarity={l.rarity} />
          </TouchableOpacity>
        );
      }
      case "opened": {
        const l = item.letter;
        const msg = LOVE_MESSAGES.find((m) => m.id === Number(l.messageId));
        const openerSlot = l.openedBySlot ?? (l.openedBy === state.personA ? "A" : l.openedBy === state.personB ? "B" : null);
        const opener = openerSlot === "A" ? (meP.slot === "A" ? meP : partnerP) : openerSlot === "B" ? (meP.slot === "B" ? meP : partnerP) : null;
        return (
          <TouchableOpacity style={styles.openedRow} onPress={() => openLetter(l)} accessibilityLabel="Đọc lại thư">
            {opener ? (
              <Avatar id={opener.avatar} size={32} ring={opener.main} />
            ) : (
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: ROLE.sharedSoft, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: FONT.bold, fontSize: 13, color: ROLE.shared }}>?</Text>
              </View>
            )}
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 21, color: COLOR.text }} numberOfLines={2}>{msg?.text ?? "Lá thư từ những ngày đầu của khu vườn."}</Text>
            <View style={{ alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
              <Stamp rarity={l.rarity} />
              <Text style={{ fontSize: 11.5, color: COLOR.textFaint, fontFamily: FONT.medium }}>Lá {pad2(Number(l.messageId) || 0)}</Text>
            </View>
          </TouchableOpacity>
        );
      }
    }
  }, [openLetter, state.personA, state.personB, meP, partnerP]);

  // Chưa nạp xong dữ liệu: hiện khung chờ thay vì "0 thư" giả — bản cũ không có cổng
  // hydrated nên mỗi lần mở lạnh đều chớp trạng thái trống sai.
  if (!hydrated) {
    return (
      <View style={s.screen}>
        <ScreenHeader title="Thư tình" subtitle="Thư rơi khi hai đứa chăm cây" fallback="/(tabs)/couple" />
        <View style={{ paddingHorizontal: SPACE.screenX, gap: 12 }}>
          <SkeletonCard height={180} />
          <SkeletonCard height={180} />
          <Text style={[s.sub, { textAlign: "center" }]}>Đang tải hộp thư...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Thư tình" subtitle="Thư rơi khi hai đứa chăm cây" fallback="/(tabs)/couple" />
      {/* Dòng đếm lưu trữ TRƠN — trang này chỉ lưu để đọc lại, không có mục tiêu sưu tập. */}
      <Text style={{ ...TYPE.caption, color: COLOR.textFaint, marginTop: 2, paddingHorizontal: SPACE.screenX }}>Hộp thư đang lưu {state.letters.length} lá thư</Text>
      <FlatList
        style={{ marginTop: 10 }}
        data={rows}
        keyExtractor={(item, i) => item.kind + ("letter" in item ? item.letter.id : i)}
        renderItem={renderRow}
        contentContainerStyle={{ gap: 9, paddingBottom: 28, paddingHorizontal: SPACE.screenX }}
        ListFooterComponent={
          <ClosingBand art={<MailboxArt size={72} />} line="Thư chỉ rơi khi hai đứa chăm cây — mỗi lá thư là một lần hai đứa nhớ nhau." />
        }
        initialNumToRender={12}
        windowSize={7}
      />

      {/* Sheet đọc thư — giấy thư #FFFBF4, bo 32 góc trên, nút đóng SECONDARY (đúng mockup) */}
      <Modal visible={!!reading} transparent animationType="slide" onRequestClose={() => setReading(null)}>
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setReading(null)} accessibilityLabel="Đóng thư" />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          {reading && (
            <View style={{ position: "absolute", top: 18, right: 18 }}>
              <Stamp rarity={reading.msg.rarity} />
            </View>
          )}
          {reading && <LetterEnvelopeImage size={132} />}
          <Text style={{ fontFamily: FONT.extrabold, fontSize: 19, lineHeight: 25, color: COLOR.text, textAlign: "center", marginTop: 8 }}>
            {reading?.letter ? `Lá thư từ ${reading.letter.source}` : "Lá thư tình"}
          </Text>
          <Text style={{ ...TYPE.caption, color: COLOR.textSoft, textAlign: "center", marginTop: 4 }}>
            {reading?.letter ? friendlyTime(reading.letter.droppedAt) : ""}
          </Text>
          {/* Nội dung thư trong ScrollView + maxHeight: thư dài + cỡ chữ hệ thống lớn
              không tràn khỏi màn hình che mất nút Đóng. */}
          <ScrollView style={{ maxHeight: 320, alignSelf: "stretch" }} contentContainerStyle={{ paddingVertical: 6 }}>
            <Text style={styles.letterBody}>{reading?.msg.text}</Text>
          </ScrollView>
          <TouchableOpacity style={[s.btnGhost, { alignSelf: "stretch", marginTop: 8 }]} onPress={() => setReading(null)}>
            <Text style={s.btnGhostText}>Đóng thư</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  groupHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 },
  groupTitle: { fontFamily: FONT.extrabold, fontSize: 16, color: COLOR.text },
  featured: { backgroundColor: COLOR.letterPaper, borderWidth: 1, borderColor: COLOR.letterLine, borderRadius: RADIUS.card, padding: 18, alignItems: "center", position: "relative" },
  unopenedRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLOR.letterPaper, borderWidth: 1, borderColor: COLOR.letterLineSoft, borderRadius: RADIUS.inner, paddingVertical: 10, paddingHorizontal: 14 },
  openedRow: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#fff", borderWidth: 1, borderColor: COLOR.border, borderRadius: RADIUS.inner, paddingVertical: 13, paddingHorizontal: 14 },
  scrim: { flex: 1, backgroundColor: "rgba(51,39,46,0.42)" },
  sheet: { backgroundColor: COLOR.letterPaper, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 26, alignItems: "center", position: "relative" },
  grab: { width: 38, height: 5, borderRadius: 3, backgroundColor: "#EBD9D2", marginBottom: 12 },
  letterBody: { fontFamily: FONT.regular, fontSize: 17, lineHeight: 27.5, color: "#4A343E" },
});
