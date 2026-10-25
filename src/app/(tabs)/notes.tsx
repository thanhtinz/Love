import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLove } from "../../lib/store";
import { notifyPartnerOfNote } from "../../lib/push";
import { success } from "../../lib/feedback";
import { NOTE_MIN_INTERVAL_MS, NOTE_TEXT_MAX, uid, type LoveNote } from "../../lib/types";
import { MOODS } from "../../lib/content";
import { timeAgoText } from "../../lib/features";
import { MoodFace } from "../../components/FaceIcon";
import { MailboxArt } from "../../components/Art";
import { PersonChip, partnerOf, personOf } from "../../components/PersonChip";
import { COLOR, FONT, RADIUS, ROLE, SPACE, TYPE } from "../../components/theme";
import { StatusChip, s, tabBarPad, useNow } from "../../components/ui";

/**
 * Tab Note — note tình yêu của hai đứa (lõi 3).
 * - Soạn note <= 300 ký tự + mặt mood tuỳ chọn; giãn cách 5 giây/người khóa ở
 *   reducer, UI đếm ngược hiển thị rõ.
 * - Dòng thời gian mới nhất trước: avatar + tên tác giả + giờ; note của người ấy
 *   chưa đọc có chip "Mới" — chạm vào note là đánh dấu đã đọc (đồng bộ về máy
 *   người viết, họ thấy chip "Đã xem").
 */
export default function NotesScreen() {
  const { state, dispatch } = useLove();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const [text, setText] = useState("");
  const [mood, setMood] = useState("");
  const [sentTo, setSentTo] = useState("");
  const sentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const me = state.currentUser;

  useEffect(() => () => { if (sentTimer.current) clearTimeout(sentTimer.current); }, []);

  const lastMine = state.noteLog[me] ? new Date(state.noteLog[me]).getTime() : 0;
  const waitMs = Math.max(0, NOTE_MIN_INTERVAL_MS - (now - lastMine));
  const canSend = text.trim().length > 0 && waitMs <= 0;

  function send() {
    const body = text.trim();
    if (!body) return;
    const note: LoveNote = {
      id: uid(), authorSlot: me, text: body.slice(0, NOTE_TEXT_MAX),
      mood, createdAt: new Date().toISOString(), readAt: "",
    };
    dispatch({ type: "NOTE_ADD", note, user: me });
    // Đường push: nhờ edge function báo cho người ấy (thông báo đến ngay;
    // widget của họ làm mới khi hệ điều hành cho phép). Lỗi nuốt êm bên trong.
    notifyPartnerOfNote();
    setText("");
    setMood("");
    // Cảm giác (đợt "chất app" 1): rung "thành công" + nút đổi thành lời xác
    // nhận gọi tên người ấy trong ~1.6 giây — hết im lặng như trước.
    success();
    setSentTo(partnerOf(state).name);
    if (sentTimer.current) clearTimeout(sentTimer.current);
    sentTimer.current = setTimeout(() => setSentTo(""), 1600);
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACE.screenX, paddingTop: insets.top + 10, paddingBottom: tabBarPad(insets.bottom), gap: SPACE.cardGap }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={s.title}>Note tình yêu</Text>
          <Text style={[s.sub, { marginTop: 2, fontSize: 13.5 }]}>Những lời nhỏ hai đứa để lại cho nhau</Text>
        </View>

        {/* Soạn note */}
        <View style={s.card}>
          <Text style={{ ...TYPE.micro, color: COLOR.textSoft }}>Viết note cho người ấy</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {MOODS.map((m) => {
              const on = mood === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setMood(on ? "" : m.id)}
                  style={{ borderRadius: 999, borderWidth: 2, borderColor: on ? COLOR.primary : "transparent", padding: 2, opacity: on ? 1 : 0.75 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Mặt ${m.label}`}
                  accessibilityState={{ selected: on }}
                >
                  <MoodFace mood={m.id} size={36} />
                </Pressable>
              );
            })}
          </View>
          <TextInput
            style={[s.input, { marginTop: 12, minHeight: 64, textAlignVertical: "top" }]}
            placeholder="Hôm nay em/anh muốn nói..."
            placeholderTextColor={COLOR.textFaint}
            multiline
            maxLength={NOTE_TEXT_MAX}
            value={text}
            onChangeText={setText}
          />
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 10 }}>
            <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textFaint }}>
              {text.length}/{NOTE_TEXT_MAX}{waitMs > 0 ? ` · chờ ${Math.ceil(waitMs / 1000)} giây rồi gửi tiếp nhé` : ""}
            </Text>
            <TouchableOpacity
              onPress={send}
              disabled={!canSend && !sentTo}
              style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: COLOR.primary, borderRadius: RADIUS.control, paddingHorizontal: 18, minHeight: 44, opacity: canSend || sentTo ? 1 : 0.5 }}
              accessibilityRole="button"
              accessibilityLabel="Gửi note"
              accessibilityState={{ disabled: !canSend && !sentTo }}
            >
              {sentTo ? (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={{ color: "#fff", fontFamily: FONT.bold, fontSize: 14.5 }}>Đã gửi cho {sentTo}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="send" size={15} color="#fff" />
                  <Text style={{ color: "#fff", fontFamily: FONT.bold, fontSize: 14.5 }}>Gửi note</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Dòng thời gian */}
        {state.notes.length === 0 ? (
          <View style={[s.card, { alignItems: "center", paddingVertical: 26 }]}>
            <MailboxArt size={120} />
            <Text style={{ ...TYPE.cardTitle, color: COLOR.text, marginTop: 12, textAlign: "center" }}>Hộp note còn trống</Text>
            <Text style={{ ...TYPE.body, color: COLOR.textSoft, marginTop: 5, textAlign: "center" }}>
              Note đầu tiên luôn là note đáng nhớ nhất. Viết vài chữ cho người ấy ở ngay trên này nhé.
            </Text>
          </View>
        ) : (
          state.notes.map((n) => {
            const author = personOf(state, n.authorSlot);
            const mine = n.authorSlot === me;
            const unread = !mine && !n.readAt;
            const body = (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <PersonChip state={state} slot={n.authorSlot} size={20} />
                  <Text style={{ flex: 1, fontFamily: FONT.regular, fontSize: 12.5, color: COLOR.textFaint }}>{timeAgoText(n.createdAt, now)}</Text>
                  {unread ? <StatusChip label="Mới" variant="accent" /> : mine ? <StatusChip label={n.readAt ? "Đã xem" : "Chưa xem"} variant={n.readAt ? "done" : "waiting"} /> : null}
                </View>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 9, alignItems: "flex-start" }}>
                  {n.mood ? <MoodFace mood={n.mood} size={38} /> : null}
                  <Text style={{ flex: 1, ...TYPE.emphasis, color: COLOR.text }}>{n.text}</Text>
                </View>
                {unread ? (
                  <Text style={{ fontFamily: FONT.semibold, fontSize: 12.5, color: ROLE.selfDark, marginTop: 8 }}>Chạm để đánh dấu đã đọc</Text>
                ) : null}
              </>
            );
            const cardStyle = [s.card, unread ? { borderColor: COLOR.primary, borderWidth: 1.5 } : null];
            return unread ? (
              <Pressable key={n.id} style={cardStyle} onPress={() => dispatch({ type: "NOTE_READ", id: n.id, user: me })} accessibilityRole="button" accessibilityLabel={`Note của ${author.name}, chạm để đánh dấu đã đọc`}>
                {body}
              </Pressable>
            ) : (
              <View key={n.id} style={cardStyle}>{body}</View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
