import React from "react";
import { Tabs } from "expo-router";
import { LetterAndPingPops, MilestonePop, QuestCompletePop } from "../../components/Popups";
import { LoveTabBar } from "../../components/TabBar";
import { useLove } from "../../lib/store";

/**
 * Tab bar của bản rebuild — Nhà · Cây · (TIM) · Note · Hai đứa.
 * - 4 route thật: Nhà, Cây, Note (tab với badge số note CHƯA ĐỌC của người
 *   ấy gửi), Hai đứa. Thư tình KHÔNG phải tab/tính năng riêng: thư chỉ là
 *   khoảnh khắc bật lên khi chăm cây.
 * - Giữa thanh là NÚT TIM (components/TabBar.tsx) — KHÔNG phải route: thanh
 *   tab được tự vẽ qua prop `tabBar` của Tabs nên nút tim chỉ là một nút
 *   bấm trong thanh: một chạm gửi ngay một nhịp nhớ cho người ấy (hành động
 *   chính toàn app, dùng được từ mọi tab). Sheet "+" QuickActions đã bị gỡ
 *   (2026-10-25): các việc của nó về đúng nhà — viết note ở tab Note, chăm
 *   cây ở tab Cây, bản đồ + đặt trạng thái ở tab Hai đứa.
 * TUYỆT ĐỐI không khai báo màn trong nhóm (tabs) rồi ẩn bằng href: null:
 * expo-router 58 (TabsClient processScreens) đổi href:null thành options.hidden=true,
 * và useVisibleTabsWithRedirect sẽ router.replace về tab đầu tiên NGAY khi một route
 * đang ẩn được focus — người dùng bấm vào hub sẽ bị bật ngược về Trang chủ (bug 2026-10-23).
 */
export default function TabsLayout() {
  const { state } = useLove();
  const me = state.currentUser;
  const unread = state.notes.filter((n) => n.authorSlot !== me && !n.readAt).length;

  return (
    <>
      <Tabs tabBar={(props) => <LoveTabBar {...props} />} screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: "Nhà" }} />
        <Tabs.Screen name="tree" options={{ title: "Cây" }} />
        <Tabs.Screen
          name="notes"
          options={{
            title: "Note",
            tabBarBadge: unread > 0 ? unread : undefined,
          }}
        />
        <Tabs.Screen name="couple" options={{ title: "Hai đứa" }} />
      </Tabs>
      {/* Pop nhận (thư rơi / nhịp nhớ / mốc ngày) mount ĐÚNG MỘT NƠI ở layout
          tabs: các màn tab đã thăm vẫn mounted song song, nếu mỗi màn tự mount
          pop thì có 2 bản Modal chồng nhau — bấm tắt bản trên lại lộ bản dưới
          (lỗi "phải bấm 2 lần mới tắt"). Một bản duy nhất ở đây = bấm 1 lần tắt. */}
      <LetterAndPingPops />
      <MilestonePop />
      <QuestCompletePop />
    </>
  );
}
