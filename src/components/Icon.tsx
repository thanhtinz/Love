"use client";
import React from "react";

/**
 * V4 — Hệ thống icon nội bộ của app: 100% inline SVG + CSS (stroke/fill = currentColor,
 * chỉnh size/màu/animation qua className Tailwind). Không dùng emoji, không CDN/font ngoài.
 */
export type IconName =
  | "heart" | "heartFill" | "drop" | "sun" | "sunrise" | "sunset" | "moon" | "star" | "sparkle"
  | "cloud" | "cloudRain" | "rainbow" | "leaf" | "clover" | "sprout" | "seed" | "tree" | "flower"
  | "petal" | "mushroom" | "bouquet" | "envelope" | "gift" | "coin" | "bug" | "ribbon" | "bell"
  | "lantern" | "butterfly" | "camera" | "calendar" | "home" | "note" | "checklist" | "chat"
  | "shuffle" | "flame" | "trophy" | "medal" | "bag" | "gear" | "logout" | "door" | "user"
  | "users" | "mail" | "lock" | "key" | "eye" | "eyeOff" | "copy" | "check" | "x" | "plus"
  | "trash" | "send" | "hug" | "kiss" | "clock" | "warning" | "crown" | "pot" | "zap" | "target"
  | "party" | "save" | "mobile" | "smile" | "empty" | "share" | "moreVertical" | "download";

const P: Record<IconName, React.ReactNode> = {
  heart: <path d="M12 20.7C6.4 17 3 13.6 3 9.9 3 7.2 5 5 7.7 5c1.7 0 3.3.9 4.3 2.3C13 5.9 14.6 5 16.3 5 19 5 21 7.2 21 9.9c0 3.7-3.4 7.1-9 10.8z" />,
  heartFill: <path d="M12 20.7C6.4 17 3 13.6 3 9.9 3 7.2 5 5 7.7 5c1.7 0 3.3.9 4.3 2.3C13 5.9 14.6 5 16.3 5 19 5 21 7.2 21 9.9c0 3.7-3.4 7.1-9 10.8z" />,
  drop: <><path d="M12 3.5c3 4 6 7.3 6 10.5a6 6 0 1 1-12 0C6 10.8 9 7.5 12 3.5z" /><path d="M9.5 14.5a2.8 2.8 0 0 0 2 3.2" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6" /></>,
  sunrise: <><path d="M12 9V3.5M8.8 6 12 2.8 15.2 6" /><path d="M6.5 15a5.5 5.5 0 0 1 11 0" /><path d="M2.5 19h19M5 21.5h14" /></>,
  sunset: <><path d="M12 3.5V9M8.8 2.8 12 6l3.2-3.2" /><path d="M6.5 15a5.5 5.5 0 0 1 11 0" /><path d="M2.5 19h19M5 21.5h14" /></>,
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />,
  sparkle: <><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" /><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" /></>,
  cloud: <path d="M7 18.5a4.5 4.5 0 1 1 .7-8.93A5.5 5.5 0 0 1 18.4 11 3.8 3.8 0 0 1 17.5 18.5z" />,
  cloudRain: <><path d="M7 15.5a4.5 4.5 0 1 1 .7-8.93A5.5 5.5 0 0 1 18.4 8 3.8 3.8 0 0 1 17.5 15.5z" /><path d="M8.5 18.5l-1 2M13 18.5l-1 2M17.5 18.5l-1 2" /></>,
  rainbow: <><path d="M4 18a8 8 0 0 1 16 0" /><path d="M7.2 18a4.8 4.8 0 0 1 9.6 0" /><path d="M2.5 21h4M17.5 21h4M2.5 18h3M18.5 18h3" /></>,
  leaf: <><path d="M5 19C5 10 11 4.5 20 4.5c0 9-5.5 15-14.5 15" /><path d="M5 19c0-5 3-9 8-11.5" /></>,
  clover: <><circle cx="9" cy="9" r="3.4" /><circle cx="15" cy="9" r="3.4" /><circle cx="9" cy="15" r="3.4" /><circle cx="15" cy="15" r="3.4" /><path d="M12 15c0 3-1 5-3 6.5" /></>,
  sprout: <><path d="M12 21v-8" /><path d="M12 13c0-3.5-2.8-5.5-7-5.5 0 4.2 2 7 7 5.5z" /><path d="M12 10.5c0-3.2 2.4-5 6.5-5 0 3.8-1.8 6.4-6.5 5z" /></>,
  seed: <><ellipse cx="12" cy="13.5" rx="5" ry="6.5" transform="rotate(24 12 13.5)" /><path d="M14.5 7.5c.3-2 1.3-3.2 3-4" /></>,
  tree: <><path d="M12 13v8M8.5 21h7" /><circle cx="12" cy="8.5" r="5" /><circle cx="7.8" cy="11" r="3.4" /><circle cx="16.2" cy="11" r="3.4" /></>,
  flower: <><circle cx="12" cy="12" r="2.4" /><circle cx="12" cy="6.6" r="2.7" /><circle cx="12" cy="17.4" r="2.7" /><circle cx="6.6" cy="12" r="2.7" /><circle cx="17.4" cy="12" r="2.7" /></>,
  petal: <path d="M12 21C6 16.5 4 11.5 6.2 5.6 12 3 18 5 19.8 5.6 22 11.5 18 16.5 12 21z" transform="rotate(18 12 12)" />,
  mushroom: <><path d="M4 11a8 7 0 0 1 16 0z" /><path d="M9.5 11v6.5A1.8 1.8 0 0 0 11.3 19h1.4a1.8 1.8 0 0 0 1.8-1.5V11" /><circle cx="9" cy="7.6" r=".4" /><circle cx="14.5" cy="6.4" r=".4" /></>,
  bouquet: <><path d="M8 3.8a2.6 2.6 0 1 1-.01 5.21A2.6 2.6 0 0 1 8 3.8zM16 3.8a2.6 2.6 0 1 1-.01 5.21A2.6 2.6 0 0 1 16 3.8zM12 6.5a2.6 2.6 0 1 1-.01 5.21A2.6 2.6 0 0 1 12 6.5z" /><path d="M7 9.5L12 21l5-11.5M7 9.5h10" /></>,
  envelope: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3.5 7l8.5 6 8.5-6" /></>,
  gift: <><rect x="3.5" y="8" width="17" height="4" rx="1" /><path d="M5.5 12v8a1.5 1.5 0 0 0 1.5 1.5h10A1.5 1.5 0 0 0 18.5 20v-8M12 8v13.5" /><path d="M12 8a2.8 2.8 0 1 1 2.8-2.8c0 1.8-2.8 2.8-2.8 2.8zM12 8a2.8 2.8 0 1 0-2.8-2.8C9.2 7 12 8 12 8z" /></>,
  coin: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5" strokeDasharray="2.5 3" /><path d="M12 9.6c.9-1 2.6-1 3.4.2M12 14.4c-.9 1-2.6 1-3.4-.2" /></>,
  bug: <><ellipse cx="12" cy="13" rx="4.5" ry="6" /><path d="M12 7v12M7.5 10.5H3.8M7.5 16H3.8M16.5 10.5h3.7M16.5 16h3.7M9 3.8L7.2 2.2M15 3.8l1.8-1.6" /></>,
  ribbon: <><path d="M12 12L4.5 6.5A2.4 2.4 0 0 1 8 3.6L12 9l4-5.4a2.4 2.4 0 0 1 3.5 2.9z" /><circle cx="12" cy="12.5" r="2.2" /><path d="M10.6 14.2L8 21l4-1.8L14.5 21l-2.6-6.8" /></>,
  bell: <><path d="M12 3v2M9 5.5c-3.8 1-4.5 4-3.2 6.6.7 1.4-.3 3.4-1.3 3.9h15c-1-.5-2-2.5-1.3-3.9C19.5 9.5 18.8 6.5 15 5.5" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /><path d="M4.5 15.5L2.8 13M19.5 15.5l1.7-2.5" /></>,
  lantern: <><path d="M9 3h6M12 3v2" /><path d="M7 9.5C7 6.8 9.2 5 12 5s5 1.8 5 4.5v5C17 17.2 14.8 19 12 19s-5-1.8-5-4.5z" /><path d="M12 19v2M7.5 9.5h9M7.5 14.5h9" /><circle cx="12" cy="12" r="1.6" /></>,
  butterfly: <><path d="M11 11C8 6.5 3.5 5.5 3 8.5c-.4 2.7 2 4.5 5 4.3C6 14 4.8 16.6 6.6 18c1.6 1.2 3.7-.3 4.4-2.5M13 11c3-4.5 7.5-5.5 8-2.5.4 2.7-2 4.5-5 4.3 2 1.2 3.2 3.8 1.4 5.2-1.6 1.2-3.7-.3-4.4-2.5" /><path d="M12 8v10M10 4.5L12 7l2-2.5" /></>,
  camera: <><path d="M4 8h3l2-2.5h6L17 8h3a1.5 1.5 0 0 1 1.5 1.5V18A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9.5A1.5 1.5 0 0 1 4 8z" /><circle cx="12" cy="13" r="3.6" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 10h17M8 2.8V6M16 2.8V6" /><path d="M8 14.5h2.5M13.5 14.5H16M8 17.8h2.5" /></>,
  home: <><path d="M3.5 11L12 3.5 20.5 11" /><path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" /><path d="M10 21v-6h4v6" /></>,
  note: <><path d="M5 3.5h14a1.5 1.5 0 0 1 1.5 1.5v9L14 20.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z" /><path d="M20.5 14H14v6.5M8 8.5h6M8 12h4" /></>,
  checklist: <><path d="M9.5 6.5h11M9.5 12h11M9.5 17.5h11" /><path d="M3 6l1.3 1.3L6.8 4.8M3 11.7l1.3 1.3 2.5-2.5M3 17.2l1.3 1.3 2.5-2.5" /></>,
  chat: <><path d="M20 4.5H4A1.5 1.5 0 0 0 2.5 6v8A1.5 1.5 0 0 0 4 15.5h3.5V21L13 15.5h7A1.5 1.5 0 0 0 21.5 14V6A1.5 1.5 0 0 0 20 4.5z" /><path d="M8 9h8M8 12h5" /></>,
  shuffle: <><path d="M3 6.5h4l10 11h4M3 17.5h4l2.8-3.1M14.2 9.6l2.8-3.1h4" /><path d="M18.5 4l2.5 2.5L18.5 9M18.5 15l2.5 2.5-2.5 2.5" /></>,
  flame: <path d="M12 21.5c-3.9 0-6.5-2.6-6.5-6.2 0-2.7 1.6-4.7 3-6.6.5 1.2 1.2 2 2.3 2.6-.3-2.8.7-6 3.2-8.3-.2 3 1 4.3 2.1 5.8 1 1.4 1.9 2.9 1.9 5 0 3.4-2.6 7.7-6 7.7z" />,
  trophy: <><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 5.5H4a3 3 0 0 0 3.2 4.5M17 5.5h3a3 3 0 0 1-3.2 4.5M12 14v3.5M8.5 20.5h7M12 17.5c-1.8 0-3 1.2-3.2 3h6.4c-.2-1.8-1.4-3-3.2-3z" /></>,
  medal: <><circle cx="12" cy="14.5" r="5" /><path d="M12 11.8l.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z" /><path d="M8.5 10L5.5 3.5h4L12 7l2.5-3.5h4L15.5 10" /></>,
  bag: <><path d="M5 8h14l-1 12.5a1.5 1.5 0 0 1-1.5 1.3h-9A1.5 1.5 0 0 1 6 20.5z" /><path d="M8.5 10.5v-2a3.5 3.5 0 0 1 7 0v2" /></>,
  gear: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.8l.9 2.7a7 7 0 0 1 2.3 1l2.8-.6 1.4 2.4-2 2a7 7 0 0 1 0 2.8l2 2-1.4 2.4-2.8-.6a7 7 0 0 1-2.3 1L12 21.2l-.9-2.7a7 7 0 0 1-2.3-1l-2.8.6L4.6 15.7l2-2a7 7 0 0 1 0-2.8l-2-2L6 6.5l2.8.6a7 7 0 0 1 2.3-1z" /></>,
  logout: <><path d="M14 4h-6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 8 20h6" /><path d="M10 12h11M17.5 8l3.5 4-3.5 4" /></>,
  door: <><rect x="5" y="2.8" width="14" height="18.4" rx="1.5" /><circle cx="15.5" cy="12" r="1" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.2-3.6 4-5.3 7.5-5.3s6.3 1.7 7.5 5.3" /></>,
  users: <><circle cx="9" cy="8.5" r="3.6" /><path d="M2.8 20c1-3.2 3.3-4.8 6.2-4.8 1.5 0 2.9.4 4 1.3M15.5 5.3a3.6 3.6 0 0 1 0 6.4M17.8 15.7c1.8.7 3 2.1 3.6 4.3" /></>,
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3.5 7l8.5 6 8.5-6" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1.4" /></>,
  key: <><circle cx="8" cy="14.5" r="4.5" /><path d="M11.3 11.2L20.5 2M17 5.5l3 3M14 8.5l2.4 2.4" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M4 4l16 16" /><path d="M10.6 6.1A9.4 9.4 0 0 1 12 6c6 0 9.5 6 9.5 6a17.6 17.6 0 0 1-2.9 3.3M6.1 8.2A16.9 16.9 0 0 0 2.5 12s3.5 6 9.5 6c1.2 0 2.3-.2 3.3-.7" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  check: <path d="M4 12.5l5.2 5L20 6.5" />,
  x: <path d="M5 5l14 14M19 5L5 19" />,
  plus: <path d="M12 4.5v15M4.5 12h15" />,
  trash: <><path d="M4 6.5h16M9.5 6V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2M6 6.5l1 13a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 19.5l1-13" /><path d="M10 10.5v6M14 10.5v6" /></>,
  send: <><path d="M21 3L10.2 13.8M21 3l-6.8 18-3.4-7.6L3 10z" /></>,
  hug: <><circle cx="7" cy="7" r="2.6" /><circle cx="17" cy="7" r="2.6" /><path d="M4.5 20v-4.5A2.8 2.8 0 0 1 7.3 12.7c1.9 0 2.9 1.2 4.7 1.2M19.5 20v-4.5a2.8 2.8 0 0 0-2.8-2.8c-1.9 0-2.9 1.2-4.7 1.2" /><path d="M12 21s-1.9-1.2-1.9-2.4c0-.7.5-1.2 1.1-1.2.4 0 .7.2.8.5.1-.3.4-.5.8-.5.6 0 1.1.5 1.1 1.2C13.9 19.8 12 21 12 21z" /></>,
  kiss: <><path d="M12 13c-1-1.8-3.4-2.4-5-1.2C5 13.2 6 14.5 7.5 15c-1.5.6-2.3 2-1.2 3.1 1.4 1.5 3.9.7 5.7-.4 1.8 1.1 4.3 1.9 5.7.4 1.1-1.1.3-2.5-1.2-3.1 1.5-.5 2.5-1.8 1-3.2-1.6-1.2-4-.6-5 1.2z" /><path d="M18.5 3l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" /></>,
  clock: <><circle cx="12" cy="12" r="8.8" /><path d="M12 7v5.2l3.4 2" /></>,
  warning: <><path d="M12 3.5L22 20H2z" /><path d="M12 10v4.2" /><circle cx="12" cy="17" r=".4" /></>,
  crown: <><path d="M3.5 18.5l-1-9L7 13l5-7.5L17 13l4.5-3.5-1 9z" /><path d="M3 21h18" /></>,
  pot: <><path d="M4.5 9.5h15l-1.3 9.3a2.5 2.5 0 0 1-2.5 2.2H8.3a2.5 2.5 0 0 1-2.5-2.2z" /><path d="M3 6.5h18v3H3z" /></>,
  zap: <path d="M13 2.5L4.5 13.5H11L9.8 21.5 19 10h-6.7z" />,
  target: <><circle cx="12" cy="12" r="8.8" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" /></>,
  party: <><path d="M4.5 20.5L9 11l6 3.5z" /><path d="M9 11a2.6 2.6 0 1 0 2.6-2.6M15 4.5c1.5.3 2 1.6 1 2.5M19 8c1.2 1 1 2.3-.3 3M13.5 2.8c.8 1.3.4 2.5-.9 3" /></>,
  save: <><path d="M5 3.5h11L20.5 8v11a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z" /><path d="M7.5 3.5V8h8V3.5M7.5 20.5v-6h9v6" /></>,
  mobile: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M10.5 5h3" /></>,
  smile: <><circle cx="12" cy="12" r="8.8" /><circle cx="9" cy="10" r=".5" /><circle cx="15" cy="10" r=".5" /><path d="M8 14.5c1 1.6 2.4 2.3 4 2.3s3-.7 4-2.3" /></>,
  empty: <circle cx="12" cy="12" r="8" strokeDasharray="3.5 4" />,
  share: <><path d="M12 15.5V4M7.8 7.8L12 3.6l4.2 4.2" /><path d="M5 12.5H4a1.8 1.8 0 0 0-1.8 1.8v5A1.8 1.8 0 0 0 4 21.2h16a1.8 1.8 0 0 0 1.8-1.8v-5A1.8 1.8 0 0 0 20 12.5h-1" /></>,
  moreVertical: <><circle cx="12" cy="5" r="1.7" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" /><circle cx="12" cy="19" r="1.7" fill="currentColor" stroke="none" /></>,
  download: <><path d="M12 3.5V15M7.3 10.8L12 15.5l4.7-4.7" /><path d="M3.5 19.5h17" /></>,
};

const FILLED: ReadonlySet<IconName> = new Set(["heartFill"]);

export function Icon({ name, className = "w-5 h-5", strokeWidth = 2 }: { name: IconName; className?: string; strokeWidth?: number }) {
  const filled = FILLED.has(name);
  return (
    <svg viewBox="0 0 24 24" className={`inline-block shrink-0 ${className}`} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name]}
    </svg>
  );
}

/** Map giá trị icon đã lưu trong state cũ (V1–V3 lưu emoji) -> tên icon mới. Khoá viết bằng unicode escape để source không chứa ký tự emoji. */
const LEGACY_ICON_MAP: Record<string, IconName> = {
  "\u{1F4A7}": "drop", "\u2600\uFE0F": "sun", "\u{1F496}": "heart", "\u{1F41B}": "bug",
  "\u2728": "sparkle", "\u{1F389}": "party", "\u{1F4CC}": "note", "\u{1F4AC}": "chat",
  "\u{1F6CD}\uFE0F": "bag", "\u{1F4F8}": "camera", "\u{1F381}": "gift", "\u{1F4A1}": "sparkle",
  "\u{1F525}": "flame", "\u{1F3C6}": "trophy", "\u{1F4A5}": "zap", "\u26A1": "zap",
  "\u{1F331}": "sprout", "\u{1F4C5}": "calendar", "\u{1F5D1}\uFE0F": "trash", "\u{1F49E}": "heart",
  "\u{1F495}": "heart", "\u{1F49D}": "heart", "\u{1F49C}": "heart", "\u{1F49B}": "heart",
  "\u{1F499}": "heart", "\u2764\uFE0F": "heart", "\u2764": "heart", "\u{1F343}": "leaf",
  "\u{1F319}": "moon", "\u2B50": "star", "\u{1F31F}": "star", "\u2601\uFE0F": "cloud",
  "\u{1F30C}": "moon", "\u{1F307}": "sunset", "\u{1F305}": "sunrise", "\u{1F308}": "rainbow",
  "\u{1F98B}": "butterfly", "\u{1F33F}": "leaf", "\u{1F33C}": "flower", "\u{1F338}": "flower",
  "\u{1F33A}": "flower", "\u{1F33B}": "flower", "\u{1F33E}": "flower", "\u{1F340}": "clover",
  "\u{1F344}": "mushroom", "\u{1FAB4}": "pot", "\u{1F380}": "ribbon", "\u{1F390}": "bell",
  "\u{1F3EE}": "lantern", "\u{1F451}": "crown", "\u{1F947}": "medal", "\u{1F3AF}": "target",
  "\u{1F3B2}": "shuffle", "\u{1F4AD}": "chat", "\u{1F970}": "smile", "\u{1F60A}": "smile",
};
export const ICON_NAMES: ReadonlySet<string> = new Set(Object.keys(P) as IconName[]);
/** Nhận tên icon mới hoặc emoji cũ đã lưu -> trả tên icon hợp lệ để render. */
export function iconForActivity(value: string | undefined): IconName {
  if (!value) return "heart";
  if (ICON_NAMES.has(value)) return value as IconName;
  return LEGACY_ICON_MAP[value] || "heart";
}
