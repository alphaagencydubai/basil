// Everything the app remembers — on this phone only.
//
// The bag, the orders placed from it, the reservations requested, and the
// member record Basil Club keeps: leaves (points), tier, a ledger of every leaf
// in and out, the pizza stamp card, and the wallet of vouchers.
//
// A preview has no back end and does not pretend to — nothing here reaches
// Basil. What it does do is behave the way the real thing would: points land
// when an order has been SERVED, not when it is placed, and so do its pizza
// stamps; a tier is lifetime and never falls; a redeemed reward leaves the
// balance at once and waits in the wallet; the eighth stamp turns itself into
// a pizza on the house; and
// reconcile() settles whatever the clock has overtaken each time the app comes
// back to the front.

import { CLUB, ORDER, REWARDS, STAMP_PRIZE, STORAGE } from "./config.js";
import { ITEMS, OPTION_GROUPS, byId, catById } from "./data.js";
import { daysUntil } from "./jalali.js";
import { DAY, addDays, code, firstName, hash32, readJSON, rng, sum, uid, writeJSON } from "./util.js";

const K = {
  bag: STORAGE + "bag",
  orders: STORAGE + "orders",
  member: STORAGE + "member",
  res: STORAGE + "reservations",
  seq: STORAGE + "seq",
};

/* -------------------------------------------------------------- listeners */
const subs = new Set();
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
function emit() { subs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); }
const put = (k, v) => { writeJSON(k, v); emit(); };

/* ------------------------------------------------------- options and prices */
export function defaults(item) {
  const o = {};
  for (const g of item?.options || []) o[g] = OPTION_GROUPS[g].choices[0].id;
  return o;
}

export function unitPrice(item, opts = {}) {
  let p = item.price;
  for (const g of item.options || []) {
    const c = OPTION_GROUPS[g].choices.find((x) => x.id === opts[g]);
    if (c?.add) p += c.add;
  }
  return p;
}

/** Only the choices that differ from how it comes: "Large · Oat". */
export function optsLabel(item, opts = {}) {
  return (item?.options || []).map((g) => {
    const grp = OPTION_GROUPS[g];
    const c = grp.choices.find((x) => x.id === opts[g]);
    return c && c.id !== grp.choices[0].id ? (g === "serves" ? `Serves ${c.label.toLowerCase()}` : c.label) : null;
  }).filter(Boolean).join(" · ");
}

const keyOf = (id, opts) => id + "|" + Object.keys(opts).sort().map((k) => `${k}=${opts[k]}`).join("&");

/* -------------------------------------------------------------------- bag */
export const bag = () => readJSON(K.bag, []).filter((l) => byId(l.id) && l.qty > 0);
export const bagCount = () => sum(bag(), (l) => l.qty);
export const lineUnit = (l) => unitPrice(byId(l.id), l.opts);
export const lineTotal = (l) => lineUnit(l) * l.qty;
export const qtyOf = (id) => sum(bag().filter((l) => l.id === id), (l) => l.qty);

export function addLine(id, qty = 1, opts = null) {
  const item = byId(id);
  if (!item) return null;
  const o = { ...defaults(item), ...(opts || {}) };
  const key = keyOf(id, o);
  const lines = bag();
  const hit = lines.find((l) => l.key === key);
  if (hit) hit.qty = Math.min(20, hit.qty + qty);
  else lines.push({ key, id, qty: Math.min(20, qty), opts: o });
  put(K.bag, lines);
  return key;
}

export function setQty(key, qty) {
  let lines = bag();
  const l = lines.find((x) => x.key === key);
  if (!l) return;
  if (qty <= 0) lines = lines.filter((x) => x.key !== key);
  else l.qty = Math.min(20, qty);
  put(K.bag, lines);
}

export function removeLine(key) {
  const lines = bag();
  const i = lines.findIndex((x) => x.key === key);
  if (i < 0) return null;
  const [gone] = lines.splice(i, 1);
  put(K.bag, lines);
  return { line: gone, index: i };
}
export function restoreLine({ line, index }) {
  const lines = bag();
  lines.splice(Math.min(index, lines.length), 0, line);
  put(K.bag, lines);
}
export const clearBag = () => put(K.bag, []);

/* ----------------------------------------------------------------- member */
const EMPTY = () => ({
  v: 1, id: "", name: "", mobile: "", birthday: null, joined: null,
  points: 0, lifetime: 0,
  history: [],                 // {at, pts, why} — the ledger, newest first
  wallet: [],                  // vouchers: {id, source, ref, label, kind, pct, cap, item, cat, claimed, expires, usedOn}
  stamps: 0,                   // pizzas on the current card (0 … stampsPerCard-1)
  cards: 0,                    // cards filled, each one a pizza on the house
  prefs: { seating: "any", heat: "mild", offers: true, notes: "" },
  referral: "",
});

function loadMember() {
  const raw = readJSON(K.member, null);
  const base = EMPTY();
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base, ...raw,
    prefs: { ...base.prefs, ...(raw.prefs || {}) },
    history: Array.isArray(raw.history) ? raw.history : [],
    wallet: Array.isArray(raw.wallet) ? raw.wallet : [],
    stamps: Number(raw.stamps) || 0,
    cards: Number(raw.cards) || 0,
  };
}

let member = loadMember();
const saveMember = () => put(K.member, member);

// another tab, or the e2e suite, wrote the store: read it again
addEventListener("storage", (e) => {
  if (e.key && !e.key.startsWith(STORAGE)) return;
  member = loadMember();
  emit();
});

export const me = () => member;
export const isMember = () => Boolean(member.id);

function ledger(pts, why, at = Date.now()) {
  member.history.unshift({ at, pts, why });
  member.history.sort((a, b) => b.at - a.at);
  member.history = member.history.slice(0, 80);
}
/** Points in. Earned points also raise the lifetime total that sets the tier. */
function credit(pts, why, at) {
  if (!pts) return;
  member.points += pts;
  member.lifetime += pts;
  ledger(pts, why, at);
}

/* ------------------------------------------------------------------ tiers */
export function tierOf(lifetime = member.lifetime) {
  let hit = CLUB.tiers[0];
  for (const t of CLUB.tiers) if (lifetime >= t.at) hit = t;
  return hit;
}
export const nextTier = (lifetime = member.lifetime) => CLUB.tiers.find((t) => t.at > lifetime) || null;
export function tierProgress(lifetime = member.lifetime) {
  const now = tierOf(lifetime), next = nextTier(lifetime);
  if (!next) return 1;
  return Math.min(1, Math.max(0, (lifetime - now.at) / (next.at - now.at)));
}
/** What this total earns at this member's tier. */
export const pointsFor = (total, lifetime = member.lifetime) =>
  Math.floor((Number(total) || 0) / CLUB.tomanPerPoint * tierOf(lifetime).rate);

/* --------------------------------------------------------------- identity */
export function join({ name, mobile, birthday = null }) {
  const fresh = !member.id;
  member.name = String(name || "").trim();
  member.mobile = mobile;
  member.birthday = birthday;
  if (fresh) {
    member.id = "BS-" + code(5);
    member.joined = Date.now();
    const base = member.name.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4).padEnd(4, "X");
    member.referral = `${base}${hash32(member.id) % 900 + 100}`;
    credit(CLUB.welcome, "Welcome to Basil Club");
  }
  saveMember();
  return member;
}
export function updateMember(patch) {
  Object.assign(member, patch);
  saveMember();
}
export function setPrefs(patch) {
  Object.assign(member.prefs, patch);
  saveMember();
}

export const birthdayIn = () => (member.birthday ? daysUntil(member.birthday.jm, member.birthday.jd) : 999);
export const birthdayWeek = () => birthdayIn() <= 6;

/* ----------------------------------------------------------------- wallet */
export const reward = (id) => REWARDS.find((r) => r.id === id) || null;

const voucherFrom = (source, def, days) => ({
  id: uid(), source, ref: def.id, label: def.name || def.label, kind: def.kind,
  pct: def.pct || 0, cap: def.cap || 0, item: def.item || "", cat: def.cat || "",
  claimed: Date.now(), expires: Date.now() + days * DAY, usedOn: null,
});

/** Claim a reward: the points leave now, the voucher waits in the wallet for 30 days. */
export function redeem(rewardId) {
  const r = reward(rewardId);
  if (!r || !isMember() || member.points < r.cost) return null;
  member.points -= r.cost;
  ledger(-r.cost, r.name);
  const v = voucherFrom("reward", r, 30);
  member.wallet.unshift(v);
  saveMember();
  return v;
}

export const liveVouchers = (now = Date.now()) => member.wallet.filter((v) => !v.usedOn && v.expires > now);
export const voucherById = (id) => member.wallet.find((v) => v.id === id) || null;

/** What a voucher is worth against these lines — and, when nothing, why not. */
export function voucherEffect(v, lines = bag()) {
  if (!v || v.usedOn || v.expires <= Date.now()) return { amount: 0, why: "Used or expired" };
  if (!lines.length) return { amount: 0, why: "Add something first" };
  const subtotal = sum(lines, lineTotal);
  if (v.kind === "pct") {
    return { amount: Math.min(v.cap || Infinity, Math.round(subtotal * v.pct / 100 / 1000) * 1000), why: "" };
  }
  if (v.kind === "item") {
    const hits = lines.filter((l) => l.id === v.item);
    if (!hits.length) return { amount: 0, why: `Add ${byId(v.item)?.name || "it"} to use this` };
    return { amount: Math.min(...hits.map(lineUnit)), why: "" };
  }
  if (v.kind === "cat") {
    const hits = lines.filter((l) => byId(l.id)?.cat === v.cat);
    const what = v.cat === "pizza" ? "a pizza" : v.cat === "desserts" ? "a dessert" : (catById(v.cat)?.name || "it").toLowerCase();
    if (!hits.length) return { amount: 0, why: `Add ${what} to use this` };
    return { amount: Math.max(...hits.map(lineUnit)), why: "" };
  }
  return { amount: 0, why: "Show this at the counter" };
}

export function totals(lines = bag(), voucherId = null) {
  const subtotal = sum(lines, lineTotal);
  const v = voucherId ? voucherById(voucherId) : null;
  const eff = v ? voucherEffect(v, lines) : { amount: 0, why: "" };
  const discount = Math.min(subtotal, eff.amount);
  const total = subtotal - discount;
  return { subtotal, discount, total, voucher: v, why: eff.why, points: isMember() ? pointsFor(total) : 0 };
}

/* ----------------------------------------------------------------- orders */
export const orders = () => readJSON(K.orders, []);
export const orderById = (id) => orders().find((o) => o.id === id) || null;

/** 0 received · 1 in the kitchen · 2 ready · 3 served */
export function orderStage(o, now = Date.now()) {
  if (o.status === "served" || now >= o.ready + ORDER.serveGrace * 60000) return 3;
  if (now >= o.ready) return 2;
  if (now - o.at > 40000) return 1;
  return 0;
}

export function placeOrder({ mode = "table", table = "", note = "", name = "", voucherId = null } = {}) {
  const lines = bag();
  if (!lines.length) return null;
  const t = totals(lines, voucherId);
  // a number like the one called at the pass: it starts somewhere ordinary and counts up
  let seq = readJSON(K.seq, 0);
  seq = seq ? seq + 1 : 100 + Math.floor(Math.random() * 180);
  if (seq > 999) seq = 101;
  const now = Date.now();
  const o = {
    id: uid(), code: String(seq), at: now, ready: now + ORDER.prepMinutes * 60000,
    mode, table: mode === "table" ? String(table || "").trim() : "",
    note: String(note || "").trim(), name: String(name || "").trim(),
    lines: lines.map((l) => {
      const it = byId(l.id);
      return { id: l.id, name: it.name, fa: it.fa, qty: l.qty, opts: l.opts, label: optsLabel(it, l.opts), unit: unitPrice(it, l.opts) };
    }),
    subtotal: t.subtotal, discount: t.discount,
    voucher: t.discount > 0 && t.voucher ? { id: t.voucher.id, label: t.voucher.label } : null,
    total: t.total, points: t.points, member: member.id || null,
    status: "placed", credited: false,
  };
  writeJSON(K.seq, seq);
  writeJSON(K.orders, [o, ...orders()].slice(0, 40));
  if (o.voucher) {
    const v = voucherById(o.voucher.id);
    if (v) { v.usedOn = o.id; writeJSON(K.member, member); }
  }
  put(K.bag, []);
  return o;
}

/** Put a past order back in the bag. Returns how many things went in. */
export function reorder(id) {
  const o = orderById(id);
  if (!o) return 0;
  const lines = bag();
  let n = 0;
  for (const l of o.lines) {
    const it = byId(l.id);
    if (!it) continue;
    const opts = { ...defaults(it), ...(l.opts || {}) };
    const key = keyOf(l.id, opts);
    const hit = lines.find((x) => x.key === key);
    if (hit) hit.qty = Math.min(20, hit.qty + l.qty);
    else lines.push({ key, id: l.id, qty: l.qty, opts });
    n += l.qty;
  }
  put(K.bag, lines);
  return n;
}

/* ----------------------------------------------------------- reservations */
export const reservations = () => readJSON(K.res, []);
export const reservationById = (id) => reservations().find((r) => r.id === id) || null;

export function addReservation({ space, when, guests, occasion = "", name, mobile, note = "" }) {
  const r = {
    id: uid(), ref: "BS-" + code(4), space, when, guests, occasion,
    name: String(name || "").trim(), mobile, note: String(note || "").trim(),
    status: "requested", made: Date.now(), member: member.id || null,
  };
  put(K.res, [r, ...reservations()].slice(0, 40));
  return r;
}
export function cancelReservation(id) {
  const all = reservations();
  const r = all.find((x) => x.id === id);
  if (!r || r.status !== "requested") return null;
  r.status = "cancelled";
  put(K.res, all);
  return r;
}
const OVER = 2 * 3600000;   // a table two hours past its time has been and gone
export const upcomingReservations = (now = Date.now()) => reservations()
  .filter((r) => r.status === "requested" && r.when + OVER > now).sort((a, b) => a.when - b.when);
export const pastReservations = (now = Date.now()) => reservations()
  .filter((r) => r.status !== "requested" || r.when + OVER <= now).sort((a, b) => b.when - a.when);

/* ------------------------------------------------------------- stamp card */
/** How many pizzas an order carries — a tray counts as one, slices do not. */
export const pizzasIn = (o) => sum(o.lines || [], (l) => (byId(l.id)?.cat === "pizza" || l.id === "tray" ? l.qty : 0));

/** A stamp for every pizza; every full card drops a pizza on the house in the wallet. */
function stampOrder(o) {
  const n = pizzasIn(o);
  if (!n) return 0;
  member.stamps += n;
  let full = 0;
  while (member.stamps >= CLUB.stampsPerCard) {
    member.stamps -= CLUB.stampsPerCard;
    member.cards += 1;
    full++;
    member.wallet.unshift(voucherFrom("stamps", STAMP_PRIZE, 60));
  }
  return full;
}
export const stampsLeft = () => CLUB.stampsPerCard - member.stamps;

/* -------------------------------------------------------------- reconcile */
/** Settle what the clock has overtaken. Returns whether anything changed. */
export function reconcile(now = Date.now()) {
  let oChanged = false, rChanged = false, mChanged = false;
  const os = orders();
  for (const o of os) {
    if (o.status !== "placed" || now < o.ready + ORDER.serveGrace * 60000) continue;
    o.status = "served";
    oChanged = true;
    if (o.member && o.member === member.id && !o.credited) {
      if (o.points > 0) credit(o.points, `Order ${o.code}`, o.ready + ORDER.serveGrace * 60000);
      stampOrder(o);
      o.credited = true;
      mChanged = true;
    }
  }
  if (oChanged) writeJSON(K.orders, os);
  const rs = reservations();
  for (const r of rs) {
    if (r.status === "requested" && r.when + OVER <= now) { r.status = "visited"; rChanged = true; }
  }
  if (rChanged) writeJSON(K.res, rs);
  if (mChanged) writeJSON(K.member, member);
  const any = oChanged || rChanged || mChanged;
  if (any) emit();
  return any;
}

/* ------------------------------------------------------------------- demo */
/**
 * Five months of plausible visits, so the card, the tier ring and the history
 * have something to show in a preview. Seeded from the member, served, with
 * their points in the ledger — every line a real dish at its menu price.
 */
export function seedHistory() {
  if (!isMember()) return 0;
  const rand = rng(hash32("basil-demo|" + member.id));
  const pool = ITEMS.filter((i) => i.price >= 200000 && i.id !== "tray");
  const pizzas = ITEMS.filter((i) => i.cat === "pizza");
  const made = [];
  for (let i = 10; i >= 1; i--) {
    if (rand() < 0.15) continue;
    const day = addDays(new Date(), -Math.round(i * 15 + rand() * 7));
    day.setHours(13 + Math.floor(rand() * 9), rand() < 0.5 ? 0 : 30, 0, 0);
    const at = day.getTime();
    const lines = [];
    const n = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      // most visits to a pizzeria carry a pizza
      const it = k === 0 && rand() < 0.8 ? pizzas[Math.floor(rand() * pizzas.length)] : pool[Math.floor(rand() * pool.length)];
      const ex = lines.find((l) => l.id === it.id);
      if (ex) ex.qty++;
      else lines.push({ id: it.id, name: it.name, fa: it.fa, qty: 1, opts: defaults(it), label: "", unit: it.price });
    }
    const total = sum(lines, (l) => l.unit * l.qty);
    const pts = pointsFor(total);
    const o = {
      id: uid(), code: String(100 + Math.floor(rand() * 800)), at, ready: at + ORDER.prepMinutes * 60000,
      mode: rand() < 0.8 ? "table" : "takeaway", table: String(1 + Math.floor(rand() * 24)),
      note: "", name: firstName(member.name), lines, subtotal: total, discount: 0, voucher: null,
      total, points: pts, member: member.id, status: "served", credited: true,
    };
    made.push(o);
    credit(pts, `Order ${o.code}`, o.ready + ORDER.serveGrace * 60000);
    stampOrder(o);
  }
  const all = [...orders(), ...made].sort((a, b) => b.at - a.at).slice(0, 40);
  writeJSON(K.orders, all);
  const earliest = made.length ? made[0].at : Date.now();
  if (!member.joined || member.joined > earliest) member.joined = earliest - 3 * DAY;
  const visit = addDays(new Date(), -38);
  visit.setHours(20, 0, 0, 0);
  const res = reservations();
  res.push({ id: uid(), ref: "BS-" + code(4), space: "friends", when: visit.getTime(), guests: 6, occasion: "",
    name: member.name, mobile: member.mobile, note: "", status: "visited", made: visit.getTime() - 4 * DAY, member: member.id });
  writeJSON(K.res, res);
  saveMember();
  return made.length;
}

/** Everything this app ever wrote on this phone, gone — the theme choice aside. */
export function forget() {
  for (const k of Object.values(K)) { try { localStorage.removeItem(k); } catch {} }
  member = loadMember();
  emit();
}
