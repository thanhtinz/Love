import React from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLove } from "../lib/store";
import { dayKeyLocal, formatDateVN, type KeptLetterKind } from "../lib/types";
import { timeAgoText } from "../lib/features";
import { LetterEnvelopeImage, MailboxArt } from "../components/Art";
import { PersonChip, personOf } from "../components/PersonChip";
import { COLOR, FONT, RADIUS, SPACE, TYPE } from "../components/theme";
import { ScreenHeader, Stamp, s } from "../components/ui";

/**
 * HỘP THƯ ĐÃ GIỮ (đợt "chất app" 2, route Stack /letters) — nơi đọc lại các
 * KỶ VẬT thư tình: mỗi lá thư rơi (chăm cây / combo Song chăm / cây lên giai
 * đoạn) được reducer ghi vào state.keptLetters ngay tại khoảnh khắc rơi, hai
 * máy union-merge theo id nên hộp thư của hai đứa luôn giống nhau.
 * Chỉ đọc — thư đã giữ là kỷ vật, không xoá, không sửa. Mới nhất đứng đầu,
 * tối đa 100 lá (cũ nhất tự rơi ra khi đầy — xem lib/features.addKeptLetter).
 */
const KIND_LABEL: Record<KeptLetterKind, string> = {
  care: "Rơi khi chăm cây",
  combo: "Combo Song chăm",
  stage: "Lên giai đoạn mới",
};

export default function LettersScreen() {
  const { state } = useLove();
  const insets = useSafeAreaInsets();
  const letters = state.keptLetters;

  return (
    <View style={s.screen}>
      <ScreenHeader
        title="Hộp thư đã giữ"
        subtitle={letters.length > 0 ? `${letters.length} lá thư tình hai đứa đã giữ lại` : "Nơi giữ những lá thư tình của hai đứa"}
        fallback="/(tabs)/couple"
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SPACE.screenX, paddingBottom: insets.bottom + 28, gap: SPACE.cardGap }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: "center", paddingTop: 2 }}>
          <MailboxArt size={120} />
        </View>

        {letters.length === 0 ? (
          <View style={[s.card, { alignItems: "center", paddingVertical: 26 }]}>
            <LetterEnvelopeImage size={54} />
            <Text style={{ ...TYPE.bodyStrong, color: COLOR.text, marginTop: 10, textAlign: "center" }}>Hộp thư còn trống</Text>
            <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 6, textAlign: "center", lineHeight: 21 }}>
              Chưa có lá thư nào được giữ — thư rơi khi hai đứa chăm cây hoặc khi cây lên giai đoạn mới.
            </Text>
          </View>
        ) : (
          letters.map((k) => {
            const by = personOf(state, k.bySlot);
            const dateMs = k.receivedAt ? new Date(k.receivedAt).getTime() : NaN;
            return (
              <View
                key={k.id}
                style={{ backgroundColor: COLOR.letterPaper, borderRadius: RADIUS.card, borderWidth: 1.5, borderColor: COLOR.letterLine, padding: 18 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Stamp rarity={k.rarity} />
                  <Text style={{ flex: 1, fontFamily: FONT.semibold, fontSize: 12.5, color: COLOR.textSoft }} numberOfLines={1}>
                    {k.source || KIND_LABEL[k.kind]}
                  </Text>
                  {isFinite(dateMs) ? (
                    <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: COLOR.textFaint }}>
                      {formatDateVN(dayKeyLocal(new Date(dateMs)))}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ fontFamily: FONT.semibold, fontSize: 15.5, lineHeight: 23.5, color: COLOR.text, marginTop: 11 }}>
                  {k.text}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 12 }}>
                  <PersonChip state={state} slot={k.bySlot} size={20} />
                  <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textSoft }}>
                    Rơi bởi {by.name}
                  </Text>
                  {isFinite(dateMs) ? (
                    <Text style={{ fontFamily: FONT.regular, fontSize: 12, color: COLOR.textFaint }}>{timeAgoText(k.receivedAt)}</Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}

        {letters.length > 0 ? (
          <Text style={{ ...TYPE.body, color: COLOR.textFaint, textAlign: "center", marginTop: 2 }}>
            Hộp thư giữ tối đa 100 lá thư gần nhất — mỗi lá rơi xuống đều được giữ lại ở đây.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
