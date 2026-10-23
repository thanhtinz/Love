import React, { memo, useCallback, useMemo, useState } from "react";
import { FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { LOVE_MESSAGES, type LoveMessage } from "../../lib/data";
import { RARITY_STYLE, type LoveLetter, type Rarity } from "../../lib/types";
import { LetterEnvelopeImage, MailboxArt } from "../../components/Art";
import { PersonChip } from "../../components/PersonChip";
import { COLOR, FONT, ROLE } from "../../components/theme";
import { C, LoadMoreRow, SectionTitle, Segmented, SkeletonCard, s } from "../../components/ui";

/** Hộp thư rút gọn: thư chưa mở hiện 3 lá đầu (mỗi lần +5), thư đã mở hiện 5 (mỗi lần +10). */
const UNOPENED_FIRST = 3;
const UNOPENED_STEP = 5;
const OPENED_FIRST = 5;
const OPENED_STEP = 10;
/** Tổng số mẫu thư — luôn lấy từ dữ liệu thật, không hardcode 36 (thêm/bớt mẫu thư
 *  trong data.ts là các chỗ "x/36" cũ lệch ngay). */
const TOTAL_MSGS = LOVE_MESSAGES.length;

/**
 * Màu accent ô thư theo độ hiếm — ĐÚNG spec mockup tham chiếu:
 * Thường = hồng #FF8FA3 · Hiếm = navy #2F4A67 · Huyền thoại = vàng ấm.
 * (Chỉ trình bày của tab Thư; RARITY_STYLE trong lib giữ nguyên cho các màn khác.)
 */
const TILE_STYLE: Record<Rarity, { accent: string; soft: string; text: string }> = {
  common: { accent: ROLE.self, soft: ROLE.selfSoft, text: ROLE.selfDark },
  rare: { accent: ROLE.shared, soft: ROLE.sharedSoft, text: ROLE.shared },
  legendary: { accent: "#E8A13A", soft: "#FDF0DC", text: "#B45309" },
};

/** Phong bì nét mảnh trong vòng tròn mềm — trình bày thư thống nhất toàn tab. */
function EnvelopeBadge({ rarity, opened = false, size = 44 }: { rarity: Rarity; opened?: boolean; size?: number }) {
  const ts = TILE_STYLE[rarity];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: ts.soft, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={opened ? "mail-open-outline" : "mail-outline"} size={Math.round(size * 0.52)} color={ts.accent} />
    </View>
  );
}

type MailRow =
  | { kind: "head-unopened"; count: number }
  | { kind: "unopened"; letter: LoveLetter }
  | { kind: "empty-unopened" }
  | { kind: "loadmore-unopened"; remaining: number }
  | { kind: "head-opened"; count: number }
  | { kind: "opened"; letter: LoveLetter }
  | { kind: "empty-opened" }
  | { kind: "loadmore-opened"; remaining: number };

/** Ô bộ sưu tập — memo + props nguyên thủy để FlatList không vẽ lại cả lưới. Ô đã sở hữu
 *  bấm được để đọc lại thư; dưới icon có số thứ tự lá thư (#id). */
const CollectionCell = memo(function CollectionCell({ msg, has, onPress }: { msg: LoveMessage; has: boolean; onPress?: (m: LoveMessage) => void }) {
  const ts = TILE_STYLE[msg.rarity];
  return (
    <TouchableOpacity
      disabled={!has}
      onPress={() => onPress?.(msg)}
      style={{ flex: 1, aspectRatio: 1, margin: 3, borderRadius: 13, alignItems: "center", justifyContent: "center", gap: 1, backgroundColor: has ? ts.soft : "#F7F2F4", borderWidth: 1.5, borderColor: has ? ts.accent : "#E9E2E6" }}
    >
      <Ionicons name={has ? "mail-open-outline" : "lock-closed"} size={15} color={has ? ts.accent : C.textFaint} />
      <Text style={{ fontSize: 9.5, fontFamily: FONT.bold, color: has ? ts.text : C.textFaint }}>#{msg.id}</Text>
    </TouchableOpacity>
  );
});

interface Reading { letter: LoveLetter | null; msg: LoveMessage }

export default function LettersScreen() {
  const { state, dispatch, hydrated } = useLove();
  const [tab, setTab] = useState<"mail" | "collection">("mail");
  const [reading, setReading] = useState<Reading | null>(null);
  const [unopenedLimit, setUnopenedLimit] = useState(UNOPENED_FIRST);
  const [openedLimit, setOpenedLimit] = useState(OPENED_FIRST);
  const [rarityFilter, setRarityFilter] = useState<"all" | Rarity>("all");
  const meName = myName(state);

  // Đã sở hữu = bộ sưu tập BỀN VỮNG hợp nhất id các lá thư hiện còn — id luôn ép SỐ vì
  // dữ liệu legacy/đồng bộ có thể mang messageId dạng chuỗi.
  const ownedIds = useMemo(() => {
    const set = new Set<number>();
    for (const n of state.letterCollection ?? []) { const v = Number(n); if (Number.isFinite(v)) set.add(v); }
    for (const l of state.letters) { const v = Number(l.messageId); if (Number.isFinite(v)) set.add(v); }
    return set;
  }, [state.letterCollection, state.letters]);

  const unopened = useMemo(() => state.letters.filter((l) => !l.opened), [state.letters]);
  const opened = useMemo(() => state.letters.filter((l) => l.opened), [state.letters]);
  const collectionMsgs = useMemo(
    () => (rarityFilter === "all" ? LOVE_MESSAGES : LOVE_MESSAGES.filter((m) => m.rarity === rarityFilter)),
    [rarityFilter],
  );

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

  // Đọc lại từ bộ sưu tập: tìm bản thư tương ứng (nếu còn trong hộp) để hiện nguồn/ngày rơi.
  const openCollected = useCallback((msg: LoveMessage) => {
    const letter = state.letters.find((l) => Number(l.messageId) === msg.id) ?? null;
    setReading({ letter, msg });
  }, [state.letters]);

  const rows = useMemo<MailRow[]>(() => {
    const r: MailRow[] = [{ kind: "head-unopened", count: unopened.length }];
    if (unopened.length === 0) r.push({ kind: "empty-unopened" });
    else {
      unopened.slice(0, unopenedLimit).forEach((l) => r.push({ kind: "unopened", letter: l }));
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
        return <Text style={[s.cardTitle, { marginTop: 2 }]}>Thư chưa mở ({item.count})</Text>;
      case "head-opened":
        return <Text style={[s.cardTitle, { marginTop: 12 }]}>Thư đã mở ({item.count})</Text>;
      case "empty-unopened":
        return (
          <View style={{ alignItems: "center", gap: 2, paddingVertical: 4 }}>
            <MailboxArt size={76} />
            <Text style={s.sub}>Chưa có thư mới — chăm cây để thư rơi nhé.</Text>
          </View>
        );
      case "empty-opened":
        return <Text style={s.sub}>Chưa mở lá thư nào.</Text>;
      case "loadmore-unopened":
        return <LoadMoreRow onPress={() => setUnopenedLimit((v) => v + UNOPENED_STEP)} label={`Xem thêm thư chưa mở (${item.remaining} còn lại)`} />;
      case "loadmore-opened":
        return <LoadMoreRow onPress={() => setOpenedLimit((v) => v + OPENED_STEP)} label={`Xem thêm thư đã mở (${item.remaining} còn lại)`} />;
      case "unopened": {
        const l = item.letter;
        const rs = RARITY_STYLE[l.rarity];
        const ts = TILE_STYLE[l.rarity];
        return (
          <TouchableOpacity style={[styles.letterRow, { borderColor: ts.accent }]} onPress={() => openLetter(l)}>
            <EnvelopeBadge rarity={l.rarity} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT.extrabold, color: C.text }}>Thư {rs.label} — {l.source}</Text>
              <Text style={s.small}>Rơi lúc {new Date(l.droppedAt).toLocaleString("vi-VN")} · Chạm để mở và nhận Xu</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
          </TouchableOpacity>
        );
      }
      case "opened": {
        const l = item.letter;
        const msg = LOVE_MESSAGES.find((m) => m.id === Number(l.messageId));
        const rs = RARITY_STYLE[l.rarity];
        const ts = TILE_STYLE[l.rarity];
        return (
          <TouchableOpacity style={[styles.letterRow, { borderColor: ts.accent }]} onPress={() => openLetter(l)}>
            <EnvelopeBadge rarity={l.rarity} opened size={40} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: C.text }} numberOfLines={2}>{msg?.text}</Text>
              <Text style={s.small}>{rs.label} · {l.source}</Text>
              <View style={{ marginTop: 4 }}>
                {l.openedBySlot ? <PersonChip state={state} slot={l.openedBySlot} size={16} /> : l.openedBy === state.personA ? <PersonChip state={state} slot="A" size={16} /> : l.openedBy === state.personB ? <PersonChip state={state} slot="B" size={16} /> : <Text style={s.small}>Người mở: {l.openedBy || "..."}</Text>}
              </View>
            </View>
          </TouchableOpacity>
        );
      }
    }
  }, [openLetter, state]);

  const filterChips = (
    <View style={{ flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
      {([["all", "Tất cả"], ["common", "Thường"], ["rare", "Hiếm"], ["legendary", "Huyền thoại"]] as const).map(([id, label]) => {
        const active = rarityFilter === id;
        return (
          <TouchableOpacity
            key={id}
            onPress={() => setRarityFilter(id)}
            style={{ paddingHorizontal: 11, paddingVertical: 10, minHeight: 44, justifyContent: "center", borderRadius: 999, borderWidth: 1.5, borderColor: active ? C.pink : "#E9E2E6", backgroundColor: active ? C.pink : "#fff" }}
          >
            <Text style={{ fontSize: 12, fontFamily: FONT.bold, color: active ? "#fff" : C.textSoft }}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // Chưa nạp xong dữ liệu: hiện khung chờ thay vì "0 thư mới / 0 lá sưu tập" giả —
  // bản cũ không có cổng hydrated nên mỗi lần mở lạnh đều chớp trạng thái trống sai.
  if (!hydrated) {
    return (
      <View style={[s.screen, { paddingTop: 44, paddingHorizontal: 16, gap: 12 }]}>
        <SectionTitle icon="mail">Hộp thư tình yêu</SectionTitle>
        <SkeletonCard height={180} />
        <SkeletonCard height={180} />
        <Text style={[s.sub, { textAlign: "center" }]}>Đang tải hộp thư...</Text>
      </View>
    );
  }

  return (
    <View style={[s.screen, { paddingTop: 44, paddingHorizontal: 16 }]}>
      <SectionTitle icon="mail">Hộp thư tình yêu</SectionTitle>
      <View style={{ height: 10 }} />
      <Segmented
        options={[{ id: "mail" as const, label: `Hộp thư (${unopened.length} mới)` }, { id: "collection" as const, label: `Bộ sưu tập ${ownedIds.size}/${TOTAL_MSGS}` }]}
        value={tab}
        onChange={setTab}
      />

      {/* QUAN TRỌNG: 2 FlatList phải có key KHÁC NHAU — bản cũ render cùng vị trí không key,
          React cập nhật numColumns tại chỗ (RN không hỗ trợ) làm vỡ lưới bộ sưu tập. */}
      {tab === "mail" ? (
        <FlatList
          key="mail"
          style={{ marginTop: 12 }}
          data={rows}
          keyExtractor={(item, i) => item.kind + ("letter" in item ? item.letter.id : i)}
          renderItem={renderRow}
          contentContainerStyle={{ gap: 9, paddingBottom: 28 }}
          initialNumToRender={12}
          windowSize={7}
        />
      ) : (
        <FlatList
          key="collection"
          style={{ marginTop: 12 }}
          data={collectionMsgs}
          keyExtractor={(m) => String(m.id)}
          numColumns={6}
          renderItem={({ item }) => <CollectionCell msg={item} has={ownedIds.has(item.id)} onPress={openCollected} />}
          ListHeaderComponent={
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
                <Text style={s.cardTitle}>Đã sưu tập {ownedIds.size}/{TOTAL_MSGS} lá</Text>
                <Text style={s.small}>{Math.round((ownedIds.size / TOTAL_MSGS) * 100)}%</Text>
              </View>
              <View style={{ height: 8, borderRadius: 99, backgroundColor: "#f1f5f9", marginTop: 7, overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${(ownedIds.size / TOTAL_MSGS) * 100}%`, backgroundColor: C.pink, borderRadius: 99 }} />
              </View>
              {filterChips}
              {ownedIds.size === 0 && (
                <View style={{ alignItems: "center", gap: 2, paddingTop: 12 }}>
                  <MailboxArt size={76} />
                  <Text style={s.sub}>Chưa sưu tập được lá nào — lá đầu tiên đang chờ rơi từ cây.</Text>
                </View>
              )}
            </View>
          }
          contentContainerStyle={{ paddingBottom: 28 }}
          initialNumToRender={36}
        />
      )}

      <Modal visible={!!reading} transparent animationType="fade" onRequestClose={() => setReading(null)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            {reading && <LetterEnvelopeImage size={76} />}
            {reading && <Text style={[s.chip, { color: TILE_STYLE[reading.msg.rarity].text, backgroundColor: TILE_STYLE[reading.msg.rarity].soft, paddingHorizontal: 10, paddingVertical: 4, fontFamily: FONT.extrabold, fontSize: 12 }]}>Thư {RARITY_STYLE[reading.msg.rarity].label}</Text>}
            {/* Nội dung thư nằm trong ScrollView + thẻ có maxHeight: thư dài + cỡ chữ
                hệ thống lớn không còn tràn khỏi màn hình che mất nút Đóng. */}
            <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ alignItems: "center" }}>
              <Text style={styles.letterText}>{reading?.msg.text}</Text>
            </ScrollView>
            <Text style={s.small}>{reading?.letter ? `${reading.letter.source} · ${new Date(reading.letter.droppedAt).toLocaleString("vi-VN")}` : "Từ Bộ sưu tập của hai đứa"}</Text>
            <TouchableOpacity style={s.btn} onPress={() => setReading(null)}><Text style={s.btnText}>Đóng thư</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  letterRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: "#E9E2E6", backgroundColor: "#fff", borderRadius: 13, padding: 11 },
  modalWrap: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", alignItems: "center", justifyContent: "center", padding: 22 },
  modalCard: { backgroundColor: "#fff", borderRadius: 22, borderWidth: 1.5, borderColor: COLOR.border, padding: 22, alignItems: "center", gap: 10, width: "100%", maxHeight: "88%" },
  letterText: { fontSize: 16.5, lineHeight: 25, color: "#7f1d1d", textAlign: "center", fontFamily: FONT.semibold },
});
