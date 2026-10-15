// The Iranian calendar.
//
// A guest in Tabriz gives a birthday as 12 Mordad, not 3 August, and books a
// table for Friday 28 Shahrivar. So the reservation strip, the birthday picker
// and the club all speak Jalali, and the Gregorian date sits beside it small.
//
// Borkowski's algorithm, ported line for line from Code Concept's ui.js, where
// it was checked against ICU's Persian calendar over every day from 1901 to
// 2050 — 54,787 dates, no disagreement. `~~` truncates toward zero, which the
// algorithm needs; Math.floor would be wrong for the negative cases.

import { pad2 } from "./util.js";

const div = (a, b) => ~~(a / b);
const mod = (a, b) => a - ~~(a / b) * b;

const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function jalCal(jy) {
  const bl = BREAKS.length, gy = jy + 621;
  let leapJ = -14, jp = BREAKS[0], jm, jump = 0, leap, n, i;
  if (jy < jp || jy >= BREAKS[bl - 1]) return null;
  for (i = 1; i < bl; i += 1) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy, gm, gd) {
  const d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
    + div(153 * mod(gm + 9, 12) + 2, 5)
    + gd - 34840408;
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  let k = jdn - g2d(gy, 3, r.march);
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    // Previous Jalali year. The leap flag comes from r — the year we started
    // from — never from the decremented jy.
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export const MONTHS = ["Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar",
  "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand"];
export const MONTHS_FA = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

export function toJalali(date = new Date()) {
  const d = new Date(date);
  return d2j(g2d(d.getFullYear(), d.getMonth() + 1, d.getDate()));
}
export const isLeap = (jy) => { const r = jalCal(jy); return Boolean(r) && r.leap === 0; };
export const monthLen = (jy, jm) => (jm <= 6 ? 31 : jm <= 11 ? 30 : isLeap(jy) ? 30 : 29);

/** "1405-06-25" — the key a Jalali day is stored under. */
export const jKey = (date = new Date()) => {
  const { jy, jm, jd } = toJalali(date);
  return `${jy}-${pad2(jm)}-${pad2(jd)}`;
};
/** "25 Shahrivar" or "25 Shahrivar 1405" */
export const jLabel = (date, { year = false } = {}) => {
  const { jy, jm, jd } = toJalali(date);
  return `${jd} ${MONTHS[jm - 1]}${year ? " " + jy : ""}`;
};
/** "25 شهریور" — set it in the FaNum face and the digits come out Persian by themselves. */
export const jLabelFa = (date, { year = false } = {}) => {
  const { jy, jm, jd } = toJalali(date);
  return `${jd} ${MONTHS_FA[jm - 1]}${year ? " " + jy : ""}`;
};

/** Days from `from` until the next (jm, jd): 0 is today. For "birthday this week". */
export function daysUntil(jm, jd, from = new Date()) {
  const start = new Date(from);
  start.setHours(12, 0, 0, 0);
  for (let i = 0; i < 370; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const j = toJalali(d);
    if (j.jm === jm && j.jd === jd) return i;
  }
  return 999;
}
