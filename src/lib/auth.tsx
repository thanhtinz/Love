"use client";
/**
 * V3 — Tài khoản riêng cho mỗi người + ghép cặp bằng mã mời.
 * Hai chế độ, tự nhận diện theo env:
 *  - "supabase": có NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 *    -> Supabase Auth thật (signUp / signInWithPassword / signOut), profile ở bảng `profiles`,
 *       ghép cặp qua RPC `create_couple` / `join_couple` (xem supabase/schema.sql).
 *  - "local": không có env (bản demo) -> tài khoản lưu trên CHÍNH máy này (localStorage).
 *    Mật khẩu được băm SHA-256 kèm salt ngẫu nhiên (Web Crypto, lặp 1000 vòng),
 *    TUYỆT ĐỐI không lưu mật khẩu gốc. Session lưu ở key riêng.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getSupabase, HAS_SUPABASE } from "./supabase";
import { genRoomCode, uid } from "./types";

export interface Profile { id: string; email: string; displayName: string; avatar: string }
export interface CoupleMemberInfo { userId: string; slot: "A" | "B"; displayName: string; avatar: string }
export interface CoupleInfo { id: string; code: string; createdBy: string; mySlot: "A" | "B"; members: CoupleMemberInfo[] }
export type AuthMode = "supabase" | "local";

interface AuthResult { error?: string; needConfirm?: boolean; sent?: boolean }
interface AuthCtxValue {
  ready: boolean;
  mode: AuthMode;
  user: Profile | null;
  couple: CoupleInfo | null;
  signUp: (email: string, password: string, displayName: string, avatar: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  createCouple: () => Promise<AuthResult>;
  joinCouple: (code: string) => Promise<AuthResult>;
  leaveCouple: () => Promise<void>;
  updateMyProfile: (displayName: string, avatar: string) => Promise<AuthResult>;
  refreshCouple: () => Promise<void>;
}

const Ctx = createContext<AuthCtxValue | null>(null);
export function useAuth(): AuthCtxValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth phải nằm trong <AuthProvider>");
  return v;
}

/* ================= LOCAL MODE — lưu trên máy này ================= */
const ACCOUNTS_KEY = "love-accounts-v1";
const SESSION_KEY = "love-session-v1";
const COUPLES_KEY = "love-couples-v1";
const PENDING_KEY = "love-pending-profiles";

interface LocalAccount { id: string; email: string; salt: string; hash: string; displayName: string; avatar: string; createdAt: string }
interface LocalCouple { id: string; code: string; createdBy: string; createdAt: string; members: { userId: string; slot: "A" | "B" }[] }

function readJson<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function writeJson(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
const readAccounts = (): LocalAccount[] => readJson<LocalAccount[]>(ACCOUNTS_KEY, []);
const readCouples = (): LocalCouple[] => readJson<LocalCouple[]>(COUPLES_KEY, []);

function bytesToB64(bytes: Uint8Array): string { let s = ""; bytes.forEach((b) => { s += String.fromCharCode(b); }); return btoa(s); }
function newSalt(): string { const a = new Uint8Array(16); crypto.getRandomValues(a); return bytesToB64(a); }

/** Băm mật khẩu: SHA-256(salt + password) lặp 1000 vòng qua Web Crypto — không bao giờ lưu plaintext. */
async function hashPassword(password: string, salt: string): Promise<string> {
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const enc = new TextEncoder();
      const pw = enc.encode(password);
      let buf: Uint8Array = enc.encode(`${salt}:${password}`);
      for (let i = 0; i < 1000; i++) {
        const merged = new Uint8Array(buf.length + pw.length);
        merged.set(buf); merged.set(pw, buf.length);
        buf = new Uint8Array(await crypto.subtle.digest("SHA-256", merged));
      }
      return bytesToB64(buf);
    }
  } catch { /* rơi xuống fallback bên dưới */ }
  // Fallback khi không có Web Crypto (context không bảo mật): FNV-1a nhiều vòng kèm salt — vẫn không lưu plaintext,
  // nhưng yếu hơn SHA-256; chỉ gặp ở môi trường lạ (app chạy https/localhost luôn có Web Crypto).
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  const s = `${salt}:${password}`;
  for (let r = 0; r < 500; r++) for (let i = 0; i < s.length; i++) { h1 = Math.imul(h1 ^ s.charCodeAt(i), 0x01000193) >>> 0; h2 = Math.imul(h2 + s.charCodeAt(i) + r, 0x85ebca6b) >>> 0; }
  return `fnv:${h1.toString(16)}:${h2.toString(16)}`;
}

function localCoupleInfo(c: LocalCouple, userId: string): CoupleInfo | null {
  const me = c.members.find((m) => m.userId === userId);
  if (!me) return null;
  const accounts = readAccounts();
  return {
    id: c.id, code: c.code, createdBy: c.createdBy, mySlot: me.slot,
    members: c.members.map((m) => { const acc = accounts.find((a) => a.id === m.userId); return { userId: m.userId, slot: m.slot, displayName: acc?.displayName || "Người thương", avatar: acc?.avatar || "svg-a" }; }),
  };
}
function findLocalCouple(userId: string): CoupleInfo | null {
  const c = readCouples().find((x) => x.members.some((m) => m.userId === userId));
  return c ? localCoupleInfo(c, userId) : null;
}

/* ================= SUPABASE MODE ================= */
/* eslint-disable @typescript-eslint/no-explicit-any */
async function sbEnsureProfile(sb: any, user: any): Promise<Profile> {
  const { data } = await sb.from("profiles").select("id, display_name, avatar").eq("id", user.id).maybeSingle();
  if (data) return { id: user.id, email: user.email || "", displayName: data.display_name, avatar: data.avatar || "svg-a" };
  const pending = readJson<Record<string, { displayName: string; avatar: string }>>(PENDING_KEY, {});
  const hint = pending[(user.email || "").toLowerCase()];
  const displayName = user.user_metadata?.display_name || hint?.displayName || (user.email || "Bé").split("@")[0];
  const avatar = user.user_metadata?.avatar || hint?.avatar || "svg-a";
  await sb.from("profiles").insert({ id: user.id, display_name: displayName, avatar });
  return { id: user.id, email: user.email || "", displayName, avatar };
}
async function sbLoadCouple(sb: any, userId: string): Promise<CoupleInfo | null> {
  const { data: mem } = await sb.from("couple_members").select("couple_id, slot").eq("user_id", userId).limit(1).maybeSingle();
  if (!mem) return null;
  const { data: coupleRow } = await sb.from("couples").select("id, code, created_by").eq("id", mem.couple_id).maybeSingle();
  if (!coupleRow) return null;
  const { data: rows } = await sb.from("couple_members").select("user_id, slot, profiles(display_name, avatar)").eq("couple_id", mem.couple_id);
  const members: CoupleMemberInfo[] = (rows || []).map((r: any) => ({ userId: r.user_id, slot: r.slot, displayName: r.profiles?.display_name || "Người thương", avatar: r.profiles?.avatar || "svg-a" }));
  return { id: coupleRow.id, code: coupleRow.code, createdBy: coupleRow.created_by, mySlot: mem.slot, members };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MODE: AuthMode = HAS_SUPABASE ? "supabase" : "local";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<CoupleInfo | null>(null);
  const appliedUserId = useRef<string | null>(null);

  /** Nạp profile + couple cho một user (cả 2 chế độ). */
  const applyUser = useCallback(async (profile: Profile | null) => {
    setUser(profile);
    if (!profile) { appliedUserId.current = null; setCouple(null); return; }
    appliedUserId.current = profile.id;
    if (MODE === "supabase") {
      const sb = await getSupabase();
      setCouple(sb ? await sbLoadCouple(sb, profile.id) : null);
    } else {
      setCouple(findLocalCouple(profile.id));
    }
  }, []);

  /* ---- Khởi tạo: khôi phục session ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (MODE === "supabase") {
        const sb = await getSupabase();
        if (!sb) { setReady(true); return; }
        const { data } = await sb.auth.getSession();
        if (!cancelled) {
          if (data.session?.user) { const p = await sbEnsureProfile(sb, data.session.user); if (!cancelled) await applyUser(p); }
          setReady(true);
        }
        const { data: sub } = sb.auth.onAuthStateChange(async (_event, session) => {
          if (cancelled) return;
          if (session?.user) {
            if (appliedUserId.current !== session.user.id) { const p = await sbEnsureProfile(sb, session.user); if (!cancelled) await applyUser(p); }
          } else if (appliedUserId.current) { await applyUser(null); }
          setReady(true);
        });
        return () => { sub.subscription.unsubscribe(); };
      }
      // local: session lưu ở key riêng
      const sess = readJson<{ userId: string } | null>(SESSION_KEY, null);
      const acc = sess ? readAccounts().find((a) => a.id === sess.userId) : undefined;
      if (!cancelled) {
        if (acc) await applyUser({ id: acc.id, email: acc.email, displayName: acc.displayName, avatar: acc.avatar });
        setReady(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshCouple = useCallback(async () => { if (user) await applyUser(user); }, [user, applyUser]);

  /* ---- Đăng ký ---- */
  const signUp = useCallback(async (emailRaw: string, password: string, displayName: string, avatar: string): Promise<AuthResult> => {
    const email = emailRaw.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { error: "Email chưa đúng định dạng nè, bạn kiểm tra lại nhé" };
    if (password.length < 6) return { error: "Mật khẩu cần ít nhất 6 ký tự nha" };
    if (!displayName.trim()) return { error: "Cho vườn biết tên hiển thị của bạn nhé" };
    if (MODE === "supabase") {
      const sb = await getSupabase(); if (!sb) return { error: "Chưa kết nối được Supabase, thử lại sau nhé." };
      const pending = readJson<Record<string, { displayName: string; avatar: string }>>(PENDING_KEY, {});
      pending[email] = { displayName: displayName.trim(), avatar };
      writeJson(PENDING_KEY, pending);
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: displayName.trim(), avatar } } });
      if (error) {
        if (/already|registered|exists/i.test(error.message)) return { error: "Email này đã có tài khoản rồi — bạn đăng nhập nhé" };
        return { error: `Đăng ký chưa thành công: ${error.message}` };
      }
      if (data.session && data.user) { const p = await sbEnsureProfile(sb, data.user); await applyUser(p); return {}; }
      return { needConfirm: true }; // Supabase yêu cầu xác nhận email -> chưa có session ngay
    }
    const accounts = readAccounts();
    if (accounts.some((a) => a.email === email)) return { error: "Email này đã có tài khoản trên máy này rồi — bạn đăng nhập nhé" };
    const salt = newSalt();
    const acc: LocalAccount = { id: uid(), email, salt, hash: await hashPassword(password, salt), displayName: displayName.trim(), avatar, createdAt: new Date().toISOString() };
    writeJson(ACCOUNTS_KEY, [...accounts, acc]);
    writeJson(SESSION_KEY, { userId: acc.id });
    await applyUser({ id: acc.id, email: acc.email, displayName: acc.displayName, avatar: acc.avatar });
    return {};
  }, [applyUser]);

  /* ---- Đăng nhập ---- */
  const signIn = useCallback(async (emailRaw: string, password: string): Promise<AuthResult> => {
    const email = emailRaw.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { error: "Email chưa đúng định dạng nè" };
    if (MODE === "supabase") {
      const sb = await getSupabase(); if (!sb) return { error: "Chưa kết nối được Supabase, thử lại sau nhé." };
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) return { error: "Sai email hoặc mật khẩu rồi — thử lại nhẹ nhàng nhé" };
      if (data.user) { const p = await sbEnsureProfile(sb, data.user); await applyUser(p); }
      return {};
    }
    const acc = readAccounts().find((a) => a.email === email);
    if (!acc) return { error: "Chưa có tài khoản với email này trên máy này — bạn đăng ký trước nhé" };
    const hash = await hashPassword(password, acc.salt);
    if (hash !== acc.hash) return { error: "Sai mật khẩu rồi — thử lại nhẹ nhàng nhé" };
    writeJson(SESSION_KEY, { userId: acc.id });
    await applyUser({ id: acc.id, email: acc.email, displayName: acc.displayName, avatar: acc.avatar });
    return {};
  }, [applyUser]);

  const signOut = useCallback(async () => {
    if (MODE === "supabase") { const sb = await getSupabase(); try { await sb?.auth.signOut(); } catch {} }
    try { localStorage.removeItem(SESSION_KEY); } catch {}
    await applyUser(null);
  }, [applyUser]);

  const resetPassword = useCallback(async (emailRaw: string): Promise<AuthResult> => {
    const email = emailRaw.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { error: "Nhập email đúng định dạng để nhận hướng dẫn nhé" };
    if (MODE === "local") return { error: "Ở chế độ trên máy này, mật khẩu đã được băm một chiều nên không khôi phục được. Bật Supabase (xem README) để có tính năng quên mật khẩu qua email nhé." };
    const sb = await getSupabase(); if (!sb) return { error: "Chưa kết nối được Supabase, thử lại sau nhé." };
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) return { error: `Chưa gửi được email khôi phục: ${error.message}` };
    return { sent: true };
  }, []);

  /* ---- Ghép cặp ---- */
  const createCouple = useCallback(async (): Promise<AuthResult> => {
    if (!user) return { error: "Bạn cần đăng nhập trước nhé." };
    if (MODE === "supabase") {
      const sb = await getSupabase(); if (!sb) return { error: "Chưa kết nối được Supabase." };
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = genRoomCode();
        const { error } = await sb.rpc("create_couple", { p_code: code });
        if (!error) { await applyUser(user); return {}; }
        if (!/unique|duplicate|23505/i.test(error.message)) return { error: `Tạo khu vườn chưa thành công: ${error.message}` };
      }
      return { error: "Tạo mã mời bị trùng nhiều lần, bạn thử lại nhé" };
    }
    const couples = readCouples();
    let code = genRoomCode();
    while (couples.some((c) => c.code === code)) code = genRoomCode();
    const c: LocalCouple = { id: uid(), code, createdBy: user.id, createdAt: new Date().toISOString(), members: [{ userId: user.id, slot: "A" }] };
    writeJson(COUPLES_KEY, [...couples, c]);
    await applyUser(user);
    return {};
  }, [user, applyUser]);

  const joinCouple = useCallback(async (codeRaw: string): Promise<AuthResult> => {
    if (!user) return { error: "Bạn cần đăng nhập trước nhé." };
    const code = codeRaw.trim().toUpperCase();
    if (code.length < 4) return { error: "Mã mời ngắn quá nè, kiểm tra lại nhé" };
    if (MODE === "supabase") {
      const sb = await getSupabase(); if (!sb) return { error: "Chưa kết nối được Supabase." };
      const { error } = await sb.rpc("join_couple", { p_code: code });
      if (error) {
        if (/CODE_NOT_FOUND/.test(error.message)) return { error: "Mã mời không đúng — bạn xin lại mã từ người thương nhé" };
        if (/COUPLE_FULL/.test(error.message)) return { error: "Khu vườn này đã đủ 2 người rồi, không vào thêm được nữa" };
        return { error: `Vào khu vườn chưa thành công: ${error.message}` };
      }
      await applyUser(user);
      return {};
    }
    const couples = readCouples();
    const idx = couples.findIndex((c) => c.code === code);
    if (idx < 0) return { error: "Mã mời không đúng — bạn xin lại mã từ người thương nhé" };
    const c = couples[idx];
    if (c.members.some((m) => m.userId === user.id)) { await applyUser(user); return {}; }
    if (c.members.length >= 2) return { error: "Khu vườn này đã đủ 2 người rồi, không vào thêm được nữa" };
    const slot: "A" | "B" = c.members.some((m) => m.slot === "A") ? "B" : "A";
    c.members = [...c.members, { userId: user.id, slot }];
    couples[idx] = c;
    writeJson(COUPLES_KEY, couples);
    await applyUser(user);
    return {};
  }, [user, applyUser]);

  const leaveCouple = useCallback(async () => {
    if (!user || !couple) return;
    if (MODE === "supabase") {
      const sb = await getSupabase();
      try { await sb?.from("couple_members").delete().eq("couple_id", couple.id).eq("user_id", user.id); } catch {}
    } else {
      const couples = readCouples().map((c) => (c.id === couple.id ? { ...c, members: c.members.filter((m) => m.userId !== user.id) } : c));
      writeJson(COUPLES_KEY, couples);
    }
    setCouple(null);
  }, [user, couple]);

  const updateMyProfile = useCallback(async (displayName: string, avatar: string): Promise<AuthResult> => {
    if (!user) return { error: "Bạn cần đăng nhập trước nhé." };
    const name = displayName.trim();
    if (!name) return { error: "Tên hiển thị không được để trống nhé" };
    if (MODE === "supabase") {
      const sb = await getSupabase(); if (!sb) return { error: "Chưa kết nối được Supabase." };
      const { error } = await sb.from("profiles").update({ display_name: name, avatar }).eq("id", user.id);
      if (error) return { error: `Lưu chưa thành công: ${error.message}` };
    } else {
      const accounts = readAccounts().map((a) => (a.id === user.id ? { ...a, displayName: name, avatar } : a));
      writeJson(ACCOUNTS_KEY, accounts);
    }
    await applyUser({ ...user, displayName: name, avatar });
    return {};
  }, [user, applyUser]);

  const value: AuthCtxValue = { ready, mode: MODE, user, couple, signUp, signIn, signOut, resetPassword, createCouple, joinCouple, leaveCouple, updateMyProfile, refreshCouple };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
