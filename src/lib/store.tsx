import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "./types";
import { defaultState, normalizeState } from "./model";
import { useAuth } from "./auth";
import { SUPABASE_ANON_KEY, SUPABASE_URL, getSupabase } from "./supabase";
import { dispatchWithStamps, type Action } from "./reducer";
import { nowIso, refreshServerOffset } from "./time";

export type { Action, CareKind } from "./reducer";

/**
 * Provider: nạp/persist state vườn (AsyncStorage + Supabase room_state) và realtime
 * Broadcast — backend GIỮ NGUYÊN như bản cũ. Logic trạng thái thuần ở lib/reducer.ts,
 * merge khi đồng bộ ở lib/merge.ts, hiệu chỉnh giờ server ở lib/time.ts.
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
  /** Thế hệ thao tác CỤC BỘ: tăng mỗi khi người dùng tự thao tác trên máy này — phân biệt
   *  "state đổi chỉ vì nhận bản đồng bộ/tải lần đầu" (echo, không phát lại) với "có thao
   *  tác cục bộ đi kèm" (phải phát/ghi bình thường). */
  const localGenRef = useRef(0);
  /** Giá trị localGen tại thời điểm bản đồng bộ gần nhất được áp vào state. */
  const remoteGenRef = useRef(0);
  const coupleIdRef = useRef<string | null>(null);
  useEffect(() => { coupleIdRef.current = coupleId; }, [coupleId]);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);
  const stateRef = useRef(state);
  const stampedRef = useRef<AppState>(state);
  /**
   * Chỉ GHI LÊN SERVER khi đã chắc chắn biết trạng thái hiện tại là "thật": đã đọc được
   * row room_state, hoặc có cache của chính máy này, hoặc người dùng đã tự thao tác.
   * Thiếu điều kiện này mà vẫn upsert thì một lần đọc lỗi mạng sẽ ghi đè VƯỜN RỖNG lên dữ liệu thật.
   */
  const persistOkRef = useRef(false);
  useEffect(() => { stateRef.current = state; }, [state]);

  const dispatch = useCallback((action: Action) => {
    if (action.type !== "SET_STATE" && action.type !== "MERGE_STATE" && action.type !== "RESET" && action.type !== "TICK" && action.type !== "SET_IDENTITY") {
      persistOkRef.current = true;
      localGenRef.current += 1;
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
            persistOkRef.current = true;
            const remote = (data as { state?: AppState }).state;
            if (remote && Object.keys(remote).length > 0) remoteState = normalizeState(remote);
          }
        } catch { /* lỗi mạng -> thử cache; persistOk giữ false để không ghi đè mù */ }
        try {
          const raw = await AsyncStorage.getItem(gardenKey(coupleId));
          if (raw) { persistOkRef.current = true; cacheState = normalizeState(JSON.parse(raw)); }
        } catch { /* bỏ qua */ }
      }
      if (cancelled) return;
      rawDispatch({ type: "RESET" });
      rawDispatch({ type: "SET_STATE", state: remoteState ?? cacheState ?? defaultState });
      // State vừa nạp là ECHO: đánh dấu để effect lưu không phát lại nguyên trạng.
      isRemote.current = true;
      remoteGenRef.current = localGenRef.current;
      // Có cả hai nguồn: merge cache (thao tác offline của chính máy này chưa kịp
      // upsert) vào bản server — tránh mất thao tác như bản thắng-tuyệt-đối cũ.
      if (remoteState && cacheState) {
        rawDispatch({ type: "MERGE_STATE", state: cacheState, mySlot: mySlot ?? undefined });
      }
      setHydratedFor(scope);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  const refreshedScope = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated || !auth.couple) return;
    if (refreshedScope.current === scope) return;
    refreshedScope.current = scope;
    auth.refreshCouple();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, scope]);

  useEffect(() => {
    if (!hydrated || !auth.couple || !auth.user) return;
    // Hàng thành viên của CHÍNH MÌNH chưa có (members chưa tải xong/stale): KHÔNG dispatch —
    // tránh ghi tên/avatar mẫu vào state rồi broadcast làm bẩn tên thật trên máy người ấy.
    const mine = auth.couple.members.find((m) => m.slot === auth.couple!.mySlot);
    if (!mine) return;
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
          // MERGE theo từng mục (không lọc thô theo updatedAt): payload "cũ hơn" vẫn
          // có thể chứa mục theo-người mới của chính chủ nhân slot đó.
          isRemote.current = true;
          remoteGenRef.current = localGenRef.current;
          rawDispatch({ type: "MERGE_STATE", state: p.state, mySlot: mySlot ?? undefined });
        }
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    channelRef.current = channel;
    return () => { try { sb.removeChannel(channel); } catch { /* bỏ qua */ } channelRef.current = null; setConnected(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, coupleId]);

  /* Lưu: cache AsyncStorage + broadcast + debounce upsert room_state.
     Mọi bản ghi đóng dấu updatedAt bằng GIỜ ĐÃ HIỆU CHỈNH theo server (lib/time.ts). */
  useEffect(() => {
    if (!hydrated || !coupleId) return;
    const forCouple = coupleId;
    const stamped: AppState = { ...state, updatedAt: nowIso() };
    stampedRef.current = stamped;
    AsyncStorage.setItem(gardenKey(coupleId), JSON.stringify(stamped)).catch(() => {});
    // Echo thuần (chỉ nhận đồng bộ/tải lần đầu): KHÔNG broadcast lại (tránh vòng lặp
    // phát) nhưng VẪN lên lịch upsert — bỏ cả upsert thì thao tác cục bộ đang chờ ghi
    // (timer lượt trước vừa bị cleanup huỷ) sẽ không bao giờ lên server.
    const isEcho = isRemote.current && localGenRef.current === remoteGenRef.current;
    if (isRemote.current) isRemote.current = false;
    if (!persistOkRef.current) return;
    if (!isEcho) {
      try { channelRef.current?.send({ type: "broadcast", event: "state", payload: { kind: "state", state: stamped } }); } catch { /* bỏ qua */ }
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // Chụp cứng snapshot + vườn đích TẠI THỜI ĐIỂM LÊN LỊCH: timer mồ côi sau khi
      // đăng xuất/đổi vườn không được upsert state vườn mới vào row của vườn cũ.
      if (coupleIdRef.current !== forCouple) return;
      const sb = getSupabase();
      sb.from("room_state").upsert({ couple_id: forCouple, state: stamped, updated_at: new Date().toISOString() }).then(({ error }) => {
        if (!error) return;
        // Upsert lỗi (Supabase báo qua {error}, không throw): thử lại 1 lần sau 3 giây.
        setTimeout(() => {
          if (coupleIdRef.current !== forCouple) return;
          getSupabase().from("room_state").upsert({ couple_id: forCouple, state: stampedRef.current, updated_at: new Date().toISOString() }).then(() => {}, () => {});
        }, 3000);
      }, () => {});
    }, 800);
    return () => { if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; } };
  }, [state, hydrated, coupleId]);

  return <Ctx.Provider value={{ state, dispatch, connected, hydrated }}>{children}</Ctx.Provider>;
}
