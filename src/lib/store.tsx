import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, defaultState } from "./types";
import { normalizeStateV5 } from "./plants";
import { useAuth } from "./auth";
import { SUPABASE_ANON_KEY, SUPABASE_URL, getSupabase } from "./supabase";
import { dispatchWithStamps, type Action } from "./reducer";
import { nowIso, refreshServerOffset } from "./time";

export { makeLetter, decideCareDrop } from "./reducer";
export type { Action, CareKind } from "./reducer";

/**
 * Provider: nạp/persist state vườn (AsyncStorage + Supabase room_state) và realtime
 * Broadcast. Toàn bộ logic trạng thái nằm ở lib/reducer.ts (thuần, có test);
 * merge khi đồng bộ nằm ở lib/merge.ts; hiệu chỉnh giờ ở lib/time.ts.
 */
const gardenKey = (coupleId: string) => `love-garden-${coupleId}`;
const Ctx = createContext<{ state: AppState; dispatch: React.Dispatch<Action>; connected: boolean; hydrated: boolean }>({ state: defaultState, dispatch: () => {}, connected: false, hydrated: false });
export function useLove() { return useContext(Ctx); }
export function myName(s: AppState) { return s.currentUser === "A" ? s.personA : s.personB; }

export function GardenProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const coupleId = auth.couple?.id ?? null;
  const mySlot = auth.couple?.mySlot ?? null;
  const [state, rawDispatch] = useReducer(dispatchWithStamps, defaultState);
  const [connected, setConnected] = React.useState(false);
  const [hydratedFor, setHydratedFor] = React.useState<string | null>(null);
  const scope = coupleId ?? "lobby";
  const hydrated = hydratedFor === scope;
  const isRemote = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);
  const stateRef = useRef(state);
  const stampedRef = useRef<AppState>(state);
  /**
   * Chỉ được GHI LÊN SERVER khi đã chắc chắn biết trạng thái hiện tại là "thật":
   * đã đọc được row room_state, hoặc có cache của chính máy này, hoặc người dùng
   * đã tự thao tác. Thiếu điều kiện này mà vẫn upsert thì một lần đọc lỗi mạng
   * (row có thật nhưng select thất bại, cache trống) sẽ ghi đè VƯỜN RỖNG lên dữ liệu thật.
   */
  const persistOkRef = useRef(false);
  useEffect(() => { stateRef.current = state; }, [state]);

  const dispatch = useCallback((action: Action) => {
    // Thao tác của chính người dùng trên máy này luôn là căn cứ để tin state hiện tại.
    if (action.type !== "SET_STATE" && action.type !== "MERGE_STATE" && action.type !== "RESET" && action.type !== "TICK" && action.type !== "SET_IDENTITY") {
      persistOkRef.current = true;
    }
    rawDispatch(action);
  }, []);

  /* Đo độ lệch giờ máy so với server — dùng cho các mốc so sánh đồng bộ (updatedAt/secTs). */
  useEffect(() => {
    refreshServerOffset(SUPABASE_URL, SUPABASE_ANON_KEY).catch(() => {});
  }, [coupleId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      persistOkRef.current = false;
      let remoteState: AppState | null = null;
      let cacheState: AppState | null = null;
      if (coupleId) {
        const sb = getSupabase();
        try {
          const { data } = await sb.from("room_state").select("state").eq("couple_id", coupleId).maybeSingle();
          if (data) {
            // Row tồn tại (kể cả state {}) -> đã có căn cứ tin cậy, được phép ghi lại sau này.
            persistOkRef.current = true;
            const remote = (data as { state?: AppState }).state;
            if (remote && Object.keys(remote).length > 0) remoteState = normalizeStateV5(remote);
          }
        } catch { /* lỗi mạng -> thử cache; persistOk giữ false để không ghi đè mù */ }
        try {
          const raw = await AsyncStorage.getItem(gardenKey(coupleId));
          if (raw) { persistOkRef.current = true; cacheState = normalizeStateV5(JSON.parse(raw)); }
        } catch { /* bỏ qua */ }
      }
      if (cancelled) return;
      rawDispatch({ type: "RESET" });
      rawDispatch({ type: "SET_STATE", state: remoteState ?? cacheState ?? defaultState });
      // Có cả hai nguồn: merge cache (mới nhất của CHÍNH máy này — vd thao tác offline
      // chưa kịp upsert trước khi app tắt) vào bản server, tránh mất thao tác như bản cũ
      // (bản cũ luôn lấy server thắng tuyệt đối).
      if (remoteState && cacheState) {
        isRemote.current = true;
        rawDispatch({ type: "MERGE_STATE", state: cacheState, mySlot: mySlot ?? undefined });
      }
      setHydratedFor(scope);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  const refreshedScope = useRef<string | null>(null);
  useEffect(() => {
    // Tải lại thông tin thành viên 1 lần mỗi vườn
    if (!hydrated || !auth.couple) return;
    if (refreshedScope.current === scope) return;
    refreshedScope.current = scope;
    auth.refreshCouple();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, scope]);

  useEffect(() => {
    if (!hydrated || !auth.couple || !auth.user) return;
    const mA = auth.couple.members.find((m) => m.slot === "A");
    const mB = auth.couple.members.find((m) => m.slot === "B");
    rawDispatch({
      type: "SET_IDENTITY",
      a: mA?.displayName || "Bé A",
      b: mB?.displayName || "Người thương",
      avatarA: mA?.avatar || "svg-a",
      avatarB: mB?.avatar || "svg-b",
      user: auth.couple.mySlot,
      roomCode: auth.couple.code,
    });
  }, [hydrated, auth.couple, auth.user]);

  useEffect(() => {
    if (!hydrated) return;
    rawDispatch({ type: "TICK" });
    const iv = setInterval(() => rawDispatch({ type: "TICK" }), 30000);
    return () => clearInterval(iv);
  }, [hydrated]);

  /* Realtime: Supabase Broadcast channel theo couple id */
  useEffect(() => {
    if (!hydrated || !coupleId) return;
    const sb = getSupabase();
    const channel = sb
      .channel(`love-room-${coupleId}`)
      .on("broadcast", { event: "state" }, ({ payload }) => {
        const p = payload as { kind?: string; state?: AppState };
        if (p?.kind === "state" && p.state) {
          // MERGE theo từng mục (không lọc thô theo updatedAt như bản cũ): kể cả payload
          // "cũ hơn" vẫn có thể chứa mục theo-người mới của chính chủ nhân slot đó.
          isRemote.current = true;
          rawDispatch({ type: "MERGE_STATE", state: p.state, mySlot: mySlot ?? undefined });
        }
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    channelRef.current = channel;
    return () => { try { sb.removeChannel(channel); } catch { /* bỏ qua */ } channelRef.current = null; setConnected(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, coupleId]);

  /* Lưu: cache AsyncStorage + broadcast + debounce upsert room_state.
     Mọi bản ghi đều đóng dấu updatedAt bằng GIỜ ĐÃ HIỆU CHỈNH theo server (lib/time.ts). */
  useEffect(() => {
    if (!hydrated || !coupleId) return;
    const stamped: AppState = { ...state, updatedAt: nowIso() };
    stampedRef.current = stamped;
    AsyncStorage.setItem(gardenKey(coupleId), JSON.stringify(stamped)).catch(() => {});
    if (isRemote.current) { isRemote.current = false; return; }
    if (!persistOkRef.current) return; // chưa đủ căn cứ tin state — không phát/ghi lên server
    try { channelRef.current?.send({ type: "broadcast", event: "state", payload: { kind: "state", state: stamped } }); } catch { /* bỏ qua */ }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const sb = getSupabase();
      sb.from("room_state").upsert({ couple_id: coupleId, state: stampedRef.current, updated_at: new Date().toISOString() }).then(() => {}, () => {});
    }, 800);
  }, [state, hydrated, coupleId]);

  return <Ctx.Provider value={{ state, dispatch, connected, hydrated }}>{children}</Ctx.Provider>;
}
