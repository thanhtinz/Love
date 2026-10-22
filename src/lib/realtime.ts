/**
 * Realtime abstraction:
 * - Mặc định: BroadcastChannel + storage event (cùng máy, 2 tab) — luôn hoạt động, không cần env.
 * - Nâng cấp: nếu có NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   thì dùng Supabase Realtime Broadcast channel theo định danh phòng (khác máy vẫn sync).
 *   Từ V3, store truyền định danh là couple id (trước ghép cặp thì là mã phòng).
 * Code lazy-load supabase (client dùng chung ở lib/supabase.ts), build/run bình thường khi không có env.
 */
export type SyncHandler = (payload: unknown) => void;

export class RealtimeSync {
  private channel: BroadcastChannel | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private supabaseChannel: any = null;
  private roomCode: string;
  private handler: SyncHandler;

  constructor(roomCode: string, handler: SyncHandler) {
    this.roomCode = roomCode;
    this.handler = handler;
  }

  connect() {
    if (typeof window === "undefined") return;
    try {
      this.channel = new BroadcastChannel(`love-room-${this.roomCode}`);
      this.channel.onmessage = (e) => this.handler(e.data);
    } catch { /* fallback qua storage event ở store */ }
    void this.connectSupabase();
  }

  private async connectSupabase() {
    try {
      // V3: dùng CHUNG client với Supabase Auth (lib/supabase.ts) — không có env thì client là null.
      const { getSupabase } = await import("./supabase");
      const client = await getSupabase();
      if (!client) return;
      this.supabaseChannel = client
        .channel(`love-room-${this.roomCode}`)
        .on("broadcast", { event: "state" }, ({ payload }: { payload: unknown }) => this.handler(payload))
        .subscribe();
      (this as unknown as { _client: unknown })._client = client;
    } catch { /* im lặng: vẫn dùng BroadcastChannel */ }
  }

  send(payload: unknown) {
    try { this.channel?.postMessage(payload); } catch {}
    try {
      if (this.supabaseChannel) {
        const client = (this as unknown as { _client?: { channel: (n: string) => unknown } })._client;
        void client;
        this.supabaseChannel.send({ type: "broadcast", event: "state", payload });
      }
    } catch {}
    try { localStorage.setItem("love-app-sync", JSON.stringify({ t: Date.now(), payload })); } catch {}
  }

  disconnect() {
    try { this.channel?.close(); } catch {}
    try { this.supabaseChannel?.unsubscribe?.(); } catch {}
  }
}
export const hasSupabase = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
