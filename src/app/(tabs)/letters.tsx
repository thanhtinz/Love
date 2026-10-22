import React, { memo, useCallback, useMemo, useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLove, myName } from "../../lib/store";
import { LOVE_MESSAGES, type LoveMessage } from "../../lib/data";
import { RARITY_STYLE, type LoveLetter } from "../../lib/types";
import { EmptyMailboxArt, LetterArt } from "../../components/illustrations";
import { PersonChip } from "../../components/PersonChip";
import { C, LoadMoreRow, SectionTitle, Segmented, s } from "../../components/ui";

const PAGE = 10;

type MailRow =
  | { kind: "head-unopened"; count: number }
  | { kind: "unopened"; letter: LoveLetter }
  | { kind: "empty-unopened" }
  | { kind: "head-opened"; count: number }
  | { kind: "opened"; letter: LoveLetter }
  | { kind: "empty-opened" }
  | { kind: "loadmore" };

/** Ô bộ sưu tập — memo + props nguyên thủy để FlatList không vẽ lại cả lưới 36 ô. */
const CollectionCell = memo(function CollectionCell({ msg, has }: { msg: LoveMessage; has: boolean }) {
  const rs = RARITY_STYLE[msg.rarity];
  return (
    <View style={{ flex: 1, aspectRatio: 1, margin: 3, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: has ? rs.bg : "#f1f5f9", borderWidth: 1.5, borderColor: has ? rs.border : "#e2e8f0" }}>
      <Ionicons name={has ? "mail-open" : "lock-closed"} size={15} color={has ? rs.text : C.textFaint} />
    </View>
  );
});

export default function LettersScreen() {
  const { state, dispatch } = useLove();
  const [tab, setTab] = useState<"mail" | "collection">("mail");
  const [reading, setReading] = useState<LoveLetter | null>(null);
  const [openedLimit, setOpenedLimit] = useState(PAGE);
  const meName = myName(state);
  const ownedIds = useMemo(() => new Set(state.letters.map((l) => l.messageId)), [state.letters]);
  const unopened = useMemo(() => state.letters.filter((l) => !l.opened), [state.letters]);
  const opened = useMemo(() => state.letters.filter((l) => l.opened), [state.letters]);

  const openLetter = useCallback((l: LoveLetter) => {
    if (!l.opened) dispatch({ type: "OPEN_LETTER", id: l.id, opener: meName });
    setReading({ ...l, opened: true });
  }, [dispatch, meName]);

  const rows = useMemo<MailRow[]>(() => {
    const r: MailRow[] = [{ kind: "head-unopened", count: unopened.length }];
    if (unopened.length === 0) r.push({ kind: "empty-unopened" });
    else unopened.forEach((l) => r.push({ kind: "unopened", letter: l }));
    r.push({ kind: "head-opened", count: opened.length });
    if (opened.length === 0) r.push({ kind: "empty-opened" });
    else opened.slice(0, openedLimit).forEach((l) => r.push({ kind: "opened", letter: l }));
    if (opened.length > openedLimit) r.push({ kind: "loadmore" });
    return r;
  }, [unopened, opened, openedLimit]);

  const renderRow = useCallback(({ item }: { item: MailRow }) => {
    switch (item.kind) {
      case "head-unopened":
        return <Text style={[s.cardTitle, { marginTop: 4 }]}>Thư chưa mở ({item.count})</Text>;
      case "head-opened":
        return <Text style={[s.cardTitle, { marginTop: 14 }]}>Thư đã mở ({item.count})</Text>;
      case "empty-unopened":
        return (
          <View style={{ alignItems: "center", gap: 4, paddingVertical: 8 }}>
            <EmptyMailboxArt size={118} />
            <Text style={s.sub}>Chưa có thư mới — chăm cây để thư rơi nhé.</Text>
          </View>
        );
      case "empty-opened":
        return <Text style={s.sub}>Chưa mở lá thư nào.</Text>;
      case "loadmore":
        return <LoadMoreRow onPress={() => setOpenedLimit((v) => v + PAGE)} label={`Xem thêm thư đã mở (${opened.length - openedLimit} còn lại)`} />;
      case "unopened": {
        const l = item.letter;
        const rs = RARITY_STYLE[l.rarity];
        return (
          <TouchableOpacity style={[styles.letterRow, { borderColor: rs.border, backgroundColor: rs.bg }]} onPress={() => openLetter(l)}>
            <LetterArt size={46} seal={rs.text} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "BeVietnamPro_800ExtraBold", color: C.text }}>Thư {rs.label} — {l.source}</Text>
              <Text style={s.small}>Rơi lúc {new Date(l.droppedAt).toLocaleString("vi-VN")} · Chạm để mở và nhận Xu</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
          </TouchableOpacity>
        );
      }
      case "opened": {
        const l = item.letter;
        const msg = LOVE_MESSAGES.find((m) => m.id === l.messageId);
        const rs = RARITY_STYLE[l.rarity];
        return (
          <TouchableOpacity style={styles.letterRow} onPress={() => openLetter(l)}>
            <LetterArt size={40} seal={rs.text} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: C.text }} numberOfLines={2}>{msg?.text}</Text>
              <Text style={s.small}>{rs.label} · {l.source}</Text>
              <View style={{ marginTop: 4 }}>
                {l.openedBy === state.personA ? <PersonChip state={state} slot="A" size={16} /> : l.openedBy === state.personB ? <PersonChip state={state} slot="B" size={16} /> : <Text style={s.small}>Người mở: {l.openedBy || "..."}</Text>}
              </View>
            </View>
          </TouchableOpacity>
        );
      }
    }
  }, [openLetter, opened.length, openedLimit, state]);

  const readingMsg = reading ? LOVE_MESSAGES.find((m) => m.id === reading.messageId) : null;

  return (
    <View style={[s.screen, { paddingTop: 44, paddingHorizontal: 16 }]}>
      <SectionTitle icon="mail">Hộp thư tình yêu</SectionTitle>
      <Text style={[s.sub, { marginTop: 4, marginBottom: 10 }]}>Thư rơi khi chăm cây và làm nhiệm vụ — mở thư để nhận Xu Tim.</Text>
      <Segmented
        options={[{ id: "mail" as const, label: `Hộp thư (${unopened.length} mới)` }, { id: "collection" as const, label: `Bộ sưu tập ${ownedIds.size}/36` }]}
        value={tab}
        onChange={setTab}
      />

      {tab === "mail" ? (
        <FlatList
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
          style={{ marginTop: 12 }}
          data={LOVE_MESSAGES}
          keyExtractor={(m) => String(m.id)}
          numColumns={6}
          renderItem={({ item }) => <CollectionCell msg={item} has={ownedIds.has(item.id)} />}
          ListHeaderComponent={
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={s.cardTitle}>Đã sưu tập {ownedIds.size}/36 lá</Text>
                <View style={s.chip}><Ionicons name="mail-open" size={13} color={C.pinkDark} /><Text style={s.chipText}>Huyền thoại hiếm nhất</Text></View>
              </View>
              <View style={{ height: 10, borderRadius: 99, backgroundColor: "#f1f5f9", marginTop: 9, overflow: "hidden" }}>
                <View style={{ height: "100%", width: `${(ownedIds.size / 36) * 100}%`, backgroundColor: C.pink, borderRadius: 99 }} />
              </View>
              {ownedIds.size === 0 && (
                <View style={{ alignItems: "center", gap: 4, paddingTop: 14 }}>
                  <EmptyMailboxArt size={118} />
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
            <LetterArt size={88} seal={reading ? RARITY_STYLE[reading.rarity].text : undefined} />
            {reading && <Text style={[s.chip, { color: RARITY_STYLE[reading.rarity].text, backgroundColor: RARITY_STYLE[reading.rarity].bg, paddingHorizontal: 10, paddingVertical: 4, fontFamily: "BeVietnamPro_800ExtraBold", fontSize: 12 }]}>Thư {RARITY_STYLE[reading.rarity].label}</Text>}
            <Text style={styles.letterText}>{readingMsg?.text}</Text>
            <Text style={s.small}>{reading?.source} · {reading ? new Date(reading.droppedAt).toLocaleString("vi-VN") : ""}</Text>
            <TouchableOpacity style={s.btn} onPress={() => setReading(null)}><Text style={s.btnText}>Đóng thư</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  letterRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: "#e2e8f0", backgroundColor: "#fff", borderRadius: 14, padding: 11 },
  modalWrap: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", alignItems: "center", justifyContent: "center", padding: 22 },
  modalCard: { backgroundColor: "#fff7ed", borderRadius: 22, borderWidth: 1.5, borderColor: "#F0C6CE", padding: 22, alignItems: "center", gap: 10, width: "100%" },
  letterText: { fontSize: 16.5, lineHeight: 25, color: "#7f1d1d", textAlign: "center", fontFamily: "BeVietnamPro_600SemiBold" },
});
