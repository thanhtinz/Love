import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getSupabase } from "./supabase";
import { genRoomCode } from "./types";

/**
 * Tài khoản Supabase Auth (đăng ký xong đăng nhập ngay — project đã tắt "Confirm email")
 * + ghép cặp qua RPC create_couple / join_couple (xem supabase/schema.sql ở bản web).
 */
export interface Profile { id: string; email: string; displayName: string; avatar: string }
export interface CoupleMemberInfo { userId: string; slot: "A" | "B"; displayName: string; avatar: string }
export interface CoupleInfo { id: string; code: string; createdBy: string; mySlot: "A" | "B"; members: CoupleMemberInfo[] }
export interface AuthResult { error?: string }

interface AuthCtxValue {
  ready: boolean;
  /** Đã tải xong thông tin vườn cho user hiện tại (kể cả kết quả "không có vườn").
   *  Cổng điều hướng phải chờ cờ này — trước đây user được set trước, couple set sau
   *  một vòng mạng nên cổng thấy "có user, chưa có vườn" và chớp qua màn Ghép cặp. */
  coupleReady: boolean;
  user: Profile | null;
  couple: CoupleInfo | null;
  signUp: (email: string, password: string, displayName: string, avatar: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  createCouple: () => Promise<AuthResult>;
  joinCouple: (code: string) => Promise<AuthResult>;
  leaveCouple: () => Promise<AuthResult>;
  updateMyProfile: (displayName: string, avatar: string) => Promise<AuthResult>;
  refreshCouple: () => Promise<void>;
}

const Ctx = createContext<AuthCtxValue | null>(null);
export function useAuth(): AuthCtxValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return v;
}

async function sbEnsureProfile(sb: any, user: any): Promise<Profile | null> {
  const { data } = await sb.from("profiles").select("id, display_name, avatar").eq("id", user.id).maybeSingle();
  if (data) return { id: user.id, email: user.email || "", displayName: data.display_name, avatar: data.avatar || "svg-a" };
  const displayName = user.user_metadata?.display_name || (user.email || "Bé").split("@")[0];
  const avatar = user.user_metadata?.avatar || "svg-a";
  const { error } = await sb.from("profiles").insert({ id: user.id, display_name: displayName, avatar });
  if (error) {
    // Insert thất bại (RLS chưa có phiên hợp lệ, hoặc race hai máy cùng tạo): thử đọc lại trước khi kết luận.
    // Bản cũ bỏ qua lỗi insert và vẫn dựng Profile "ảo" khiến app tưởng đã đăng nhập nhưng không bao giờ có couple.
    const { data: again } = await sb.from("profiles").select("id, display_name, avatar").eq("id", user.id).maybeSingle();
    if (again) return { id: user.id, email: user.email || "", displayName: again.display_name, avatar: again.avatar || "svg-a" };
    return null;
  }
  return { id: user.id, email: user.email || "", displayName, avatar };
}
async function sbLoadCouple(sb: any, userId: string): Promise<CoupleInfo | null> {
  // Phân biệt rõ "KHÔNG có vườn" (data null, không lỗi) với "TẢI LỖI" ({error}):
  // bản cũ nuốt {error} của cả 3 truy vấn nên lỗi mạng bị hiểu thành "chưa có vườn" —
  // người dùng bị đẩy về màn Ghép cặp dù đang ở trong vườn, rồi Tạo vườn lại văng
  // ALREADY_IN_COUPLE. Nay: có lỗi là THROW để nơi gọi quyết định giữ nguyên trạng thái.
  const { data: mem, error: memErr } = await sb.from("couple_members").select("couple_id, slot").eq("user_id", userId).limit(1).maybeSingle();
  if (memErr) throw memErr;
  if (!mem) return null;
  const { data: coupleRow, error: coupleErr } = await sb.from("couples").select("id, code, created_by").eq("id", mem.couple_id).maybeSingle();
  if (coupleErr) throw coupleErr;
  if (!coupleRow) return null;
  const { data: rows, error: rowsErr } = await sb.from("couple_members").select("user_id, slot, profiles(display_name, avatar)").eq("couple_id", mem.couple_id);
  if (rowsErr) throw rowsErr;
  const members: CoupleMemberInfo[] = (rows || []).map((r: any) => ({ userId: r.user_id, slot: (r.slot as "A" | "B"), displayName: r.profiles?.display_name || "Người thương", avatar: r.profiles?.avatar || "svg-a" }));
  return { id: coupleRow.id, code: coupleRow.code, createdBy: coupleRow.created_by, mySlot: mem.slot as "A" | "B", members };
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<CoupleInfo | null>(null);
  const [coupleReady, setCoupleReady] = useState(true);
  const appliedUserId = useRef<string | null>(null);
  /** Số thứ tự lời gọi applyUser — kết quả tải vườn của lời gọi CŨ đến muộn không được
   *  ghi đè trạng thái của lời gọi mới (vd refreshCouple chậm về sau khi vừa tạo vườn). */
  const applySeq = useRef(0);

  const applyUser = useCallback(async (profile: Profile | null) => {
    const seq = ++applySeq.current;
    if (!profile) {
      appliedUserId.current = null;
      setUser(null);
      setCouple(null);
      setCoupleReady(true);
      return;
    }
    const sameUser = appliedUserId.current === profile.id;
    appliedUserId.current = profile.id;
    setUser(profile);
    if (!sameUser) {
      // Đổi tài khoản: xoá couple của tài khoản TRƯỚC ngay (tránh lẫn định danh) và
      // báo "chưa sẵn sàng" để cổng điều hướng chờ thay vì chớp qua màn Ghép cặp.
      setCouple(null);
      setCoupleReady(false);
    }
    const sb = getSupabase();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const c = await sbLoadCouple(sb, profile.id);
        if (seq !== applySeq.current) return; // đã có lời gọi mới hơn — bỏ kết quả này
        setCouple(c);
        setCoupleReady(true);
        return;
      } catch {
        if (seq !== applySeq.current) return;
        if (attempt === 0) { await new Promise((r) => setTimeout(r, 1500)); continue; }
        // Tải lỗi cả 2 lần: refresh cho CHÍNH user hiện tại thì GIỮ couple đang có;
        // user mới thì đành coi như chưa có vườn (màn Ghép cặp/Tạo vườn sẽ báo rõ
        // ALREADY_IN_COUPLE nếu thực tế đã có vườn, không mất dữ liệu).
        if (!sameUser) setCouple(null);
        setCoupleReady(true);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const sb = getSupabase();
    (async () => {
      try {
        const { data } = await sb.auth.getSession();
        if (!cancelled && data.session?.user) {
          let p = await sbEnsureProfile(sb, data.session.user);
          // Hồ sơ chưa sẵn sàng (insert lỗi tạm thời): thử lại 1 lần trước khi bỏ cuộc,
          // tránh việc phiên đăng nhập còn tốt mà app đẩy người dùng về màn hình đăng nhập.
          if (!p && !cancelled) p = await sbEnsureProfile(sb, data.session.user);
          if (!cancelled && p) await applyUser(p);
        }
      } catch {
        // Mạng lỗi khi khôi phục phiên: KHÔNG được treo ở màn hình chờ mãi (bản cũ
        // setReady nằm sau await nên getSession ném lỗi là ready không bao giờ bật).
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    const { data: sub } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      try {
        if (session?.user) {
          if (appliedUserId.current !== session.user.id) { const p = await sbEnsureProfile(sb, session.user); if (!cancelled && p) await applyUser(p); }
        } else if (appliedUserId.current) { await applyUser(null); }
      } catch { /* giữ trạng thái hiện tại, ready vẫn được bật bên dưới */ }
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshCouple = useCallback(async () => { if (user) await applyUser(user); }, [user, applyUser]);

  const signUp = useCallback(async (emailRaw: string, password: string, displayName: string, avatar: string): Promise<AuthResult> => {
    const email = emailRaw.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { error: "Email chưa đúng định dạng nè, bạn kiểm tra lại nhé" };
    if (password.length < 6) return { error: "Mật khẩu cần ít nhất 6 ký tự nha" };
    if (!displayName.trim()) return { error: "Cho vườn biết tên hiển thị của bạn nhé" };
    const sb = getSupabase();
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: displayName.trim(), avatar } } });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) return { error: "Email này đã có tài khoản rồi — bạn đăng nhập nhé" };
      return { error: `Đăng ký chưa thành công: ${error.message}` };
    }
    // Không có user trong kết quả (edge case phía Supabase): KHÔNG được trả thành công
    // rỗng — màn hình tưởng đăng ký xong nhưng phiên không tồn tại, đứng yên không đi đâu.
    if (!data.user) return { error: "Đăng ký chưa hoàn tất — bạn thử lại nhé" };
    {
      const p = await sbEnsureProfile(sb, data.user);
      if (!p) return { error: "Tài khoản đã tạo nhưng hồ sơ chưa sẵn sàng — bạn thử đăng nhập lại nhé" };
      await applyUser(p);
    }
    return {};
  }, [applyUser]);

  const signIn = useCallback(async (emailRaw: string, password: string): Promise<AuthResult> => {
    const email = emailRaw.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { error: "Email chưa đúng định dạng nè" };
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { error: "Sai email hoặc mật khẩu rồi — thử lại nhẹ nhàng nhé" };
    if (!data.user) return { error: "Đăng nhập chưa hoàn tất — bạn thử lại nhé" };
    {
      const p = await sbEnsureProfile(sb, data.user);
      if (!p) return { error: "Đăng nhập được nhưng chưa tải được hồ sơ — kiểm tra mạng rồi thử lại nhé" };
      await applyUser(p);
    }
    return {};
  }, [applyUser]);

  const signOut = useCallback(async () => {
    try { await getSupabase().auth.signOut(); } catch { /* bỏ qua */ }
    await applyUser(null);
  }, [applyUser]);

  const createBusy = useRef(false);
  const joinBusy = useRef(false);

  const createCouple = useCallback(async (): Promise<AuthResult> => {
    if (!user) return { error: "Bạn cần đăng nhập trước nhé." };
    // Đã có vườn rồi thì coi như xong — tránh gọi RPC lần hai (RPC sẽ ném ALREADY_IN_COUPLE
    // và UI hiện lỗi dù thực tế đã thành công).
    if (couple) { await applyUser(user); return {}; }
    // Bấm đúp / hai lời gọi chồng nhau: chỉ một lời gọi được chạy tới RPC.
    if (createBusy.current) return { error: "Đang tạo vườn rồi, bạn chờ một chút nhé" };
    createBusy.current = true;
    try {
      const sb = getSupabase();
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = genRoomCode();
        const { error } = await sb.rpc("create_couple", { p_code: code });
        if (!error) { await applyUser(user); return {}; }
        if (/ALREADY_IN_COUPLE/.test(error.message)) return { error: "Tài khoản của bạn đã ở trong một khu vườn rồi" };
        if (!/unique|duplicate|23505/i.test(error.message)) return { error: `Tạo khu vườn chưa thành công: ${error.message}` };
      }
      return { error: "Tạo mã mời bị trùng nhiều lần, bạn thử lại nhé" };
    } finally {
      createBusy.current = false;
    }
  }, [user, couple, applyUser]);

  const joinCouple = useCallback(async (codeRaw: string): Promise<AuthResult> => {
    if (!user) return { error: "Bạn cần đăng nhập trước nhé." };
    // Đang ở trong một vườn: phía client kết luận ngay, khỏi gọi RPC.
    // (Vào lại CHÍNH vườn của mình thì RPC vốn idempotent, nhưng UI ghép cặp chỉ hiện khi chưa có vườn.)
    if (couple) return { error: "Tài khoản của bạn đã ở trong một khu vườn rồi" };
    if (joinBusy.current) return { error: "Đang vào vườn rồi, bạn chờ một chút nhé" };
    const code = codeRaw.trim().toUpperCase();
    if (code.length < 4) return { error: "Mã mời ngắn quá nè, kiểm tra lại nhé" };
    joinBusy.current = true;
    try {
      const sb = getSupabase();
      const { error } = await sb.rpc("join_couple", { p_code: code });
      if (error) {
        if (/CODE_NOT_FOUND/.test(error.message)) return { error: "Mã mời không đúng — bạn xin lại mã từ người thương nhé" };
        if (/COUPLE_FULL/.test(error.message)) return { error: "Khu vườn này đã đủ 2 người rồi, không vào thêm được nữa" };
        if (/ALREADY_IN_COUPLE/.test(error.message)) return { error: "Tài khoản của bạn đã ở trong một khu vườn khác rồi" };
        return { error: `Vào khu vườn chưa thành công: ${error.message}` };
      }
      await applyUser(user);
      return {};
    } finally {
      joinBusy.current = false;
    }
  }, [user, couple, applyUser]);

  const leaveCouple = useCallback(async (): Promise<AuthResult> => {
    if (!user || !couple) return {};
    // Supabase trả lỗi qua { error } chứ KHÔNG throw — bản cũ bọc try/catch nên lỗi xoá
    // trên server bị nuốt mất: app vẫn xoá couple ở máy này, lần mở app sau lại "vào lại"
    // vườn cũ vì dòng couple_members vẫn còn. Nay: chỉ rời hẳn khi server đã xoá xong.
    const { error } = await getSupabase().from("couple_members").delete().eq("couple_id", couple.id).eq("user_id", user.id);
    if (error) return { error: `Rời vườn chưa thành công: ${error.message} — kiểm tra mạng rồi thử lại nhé` };
    setCouple(null);
    return {};
  }, [user, couple]);

  const updateMyProfile = useCallback(async (displayName: string, avatar: string): Promise<AuthResult> => {
    if (!user) return { error: "Bạn cần đăng nhập trước nhé." };
    const name = displayName.trim();
    if (!name) return { error: "Tên hiển thị không được để trống nhé" };
    const { error } = await getSupabase().from("profiles").update({ display_name: name, avatar }).eq("id", user.id);
    if (error) return { error: `Lưu chưa thành công: ${error.message}` };
    await applyUser({ ...user, displayName: name, avatar });
    return {};
  }, [user, applyUser]);

  const value: AuthCtxValue = { ready, coupleReady, user, couple, signUp, signIn, signOut, createCouple, joinCouple, leaveCouple, updateMyProfile, refreshCouple };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
