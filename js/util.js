// Small shared helpers. No framework, no dependencies.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape anything a person typed before it goes near innerHTML. */
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const pad2 = (n) => String(n).padStart(2, "0");
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
export const sum = (xs, f = (x) => x) => xs.reduce((a, x) => a + (Number(f(x)) || 0), 0);

/** "Sara Ahmadi" → "SA"; a single name → its first letter. */
export function initials(name) {
  const p = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "";
  return (p[0][0] + (p[1] ? p[1][0] : "")).toUpperCase();
}
export const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "";

/* ------------------------------------------------------------------ money */
// Toman, grouped the way an Iranian receipt groups it. The unit is set small
// beside the figure rather than spelled out on every line.
export const money = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");
export const priceText = (n) => `${money(n)} T`;
export const priceHTML = (n) =>
  `<span class="price"><span class="price-n">${money(n)}</span><span class="price-u">T</span></span>`;

/** 86,400,000 → "86.4M"; 640,000 → "640K". For the staff console's big numbers. */
export function compact(n) {
  const v = Math.abs(Number(n) || 0);
  const trim = (x) => x.replace(/\.0$/, "");
  if (v >= 1e9) return trim((n / 1e9).toFixed(v >= 1e10 ? 0 : 1)) + "B";
  if (v >= 1e6) return trim((n / 1e6).toFixed(v >= 1e8 ? 0 : 1)) + "M";
  if (v >= 1e3) return Math.round(n / 1e3) + "K";
  return String(Math.round(n));
}

export const plural = (n, one, many = one + "s") =>
  `${Number(n).toLocaleString("en-US")} ${n === 1 ? one : many}`;

/* ----------------------------------------------------------------- digits */
// A Persian keyboard types ۰–۹ (and an Arabic one ٠–٩). Everything is stored in 0–9.
export const latinDigits = (s) => String(s ?? "")
  .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/** Any Iranian mobile, however it was typed → "09xxxxxxxxx", or "" if it is not one. */
export function normMobile(s) {
  let d = latinDigits(s).replace(/\D/g, "");
  if (d.startsWith("0098")) d = d.slice(4);
  else if (d.startsWith("98") && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith("9")) d = "0" + d;
  return /^09\d{9}$/.test(d) ? d : "";
}
export function prettyMobile(m) {
  const d = normMobile(m);
  return d ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : String(m || "");
}
export function maskMobile(m) {
  const d = normMobile(m);
  return d ? `${d.slice(0, 4)} ••• ${d.slice(7)}` : "";
}

/* ------------------------------------------------------------------ dates */
export const DAY = 86400000;
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTHS_G = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};
export const sameDay = (a, b) => dayKey(a) === dayKey(b);
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY);
export const minutesOfDay = (d) => d.getHours() * 60 + d.getMinutes();

/** 13:05 — the 24-hour clock, as Tabriz reads it. */
export const hm = (ts) => {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
export const clockOf = (mins) => `${pad2(Math.floor(mins / 60) % 24)}:${pad2(mins % 60)}`;
/** "Tue 22 Sep" */
export const gDate = (ts) => {
  const d = new Date(ts);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS_G[d.getMonth()]}`;
};

export function ago(ts, now = Date.now()) {
  const d = daysBetween(ts, now);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 14) return "last week";
  if (d < 60) return `${Math.round(d / 7)} weeks ago`;
  if (d < 365) return `${Math.round(d / 30)} months ago`;
  const y = Math.round(d / 365);
  return y === 1 ? "a year ago" : `${y} years ago`;
}
export const minsLeft = (ts, now = Date.now()) => Math.max(0, Math.ceil((ts - now) / 60000));

/* ---------------------------------------------------------------- seeding */
/** Deterministic 32-bit FNV-1a, so the preview shows the same thing twice. */
export function hash32(str) {
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
/** Tiny seeded PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (rand, xs) => xs[Math.floor(rand() * xs.length) % xs.length];

/** A short code that reads down a phone line: no 0/O, no 1/I. */
export function code(n = 4, rand = Math.random) {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < n; i++) s += abc[Math.floor(rand() * abc.length)];
  return s;
}

/* ---------------------------------------------------------------- storage */
export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
export function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
