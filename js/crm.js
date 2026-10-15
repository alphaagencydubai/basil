// The staff side of Basil Club: the guest book a club like this builds.
//
// SAMPLE DATA, and labelled so on every screen that shows it. 164 guests with
// up to a year of visits each, seeded so every device and every reload shows
// the same book, and stored as day OFFSETS so it never goes stale: a guest who
// was last in "4 days ago" is still last in 4 days ago next month.
//
// One record is real: this phone's own member, if there is one. Their served
// orders are in it as visits and their live orders show on the pass, so a guest
// who orders in the preview and then opens the console finds themselves there.

import { CLUB } from "./config.js";
import { ITEMS, byId } from "./data.js";
import { daysUntil } from "./jalali.js";
import * as store from "./store.js";
import { DAY, addDays, dayKey, hash32, pick, rng, startOfDay, sum } from "./util.js";

const FEMALE = ["Sara", "Maryam", "Negar", "Parisa", "Leila", "Shirin", "Nazanin", "Mahsa", "Elnaz", "Ghazal",
  "Yasaman", "Hanieh", "Roya", "Setareh", "Mina", "Tara", "Ayda", "Bahar", "Niloufar", "Sepideh",
  "Aylin", "Sevda", "Gunay", "Aynaz"];
const MALE = ["Ali", "Reza", "Amir", "Mohammad", "Hossein", "Mehdi", "Arash", "Babak", "Kaveh", "Farhad",
  "Saeed", "Hamed", "Pouya", "Sina", "Behnam", "Navid", "Ramin", "Omid", "Yashar", "Araz",
  "Tohid", "Elchin", "Orkhan", "Sahand"];
const LAST = ["Ahmadi", "Hosseini", "Karimi", "Rezaei", "Mohammadi", "Jafari", "Rahimi", "Moradi", "Sadeghi",
  "Ebrahimi", "Azizi", "Najafi", "Asgari", "Bagheri", "Nazari", "Farahani", "Talebi", "Mousavi", "Ghorbani",
  "Heidari", "Azari", "Mirzaei", "Pourmand", "Shams", "Zand", "Yazdani", "Soltani", "Kazemi", "Sharifi", "Alavi"];

const GUESTS = 164;
const SPAN = 380;   // days of history

export const tierFor = (lifetime) => {
  let t = CLUB.tiers[0];
  for (const x of CLUB.tiers) if (lifetime >= x.at) t = x;
  return t;
};

/* -------------------------------------------------------------- the book */
let RAW = null;

function build() {
  const rand = rng(hash32("basil-guestbook-v1"));
  const kitchen = ITEMS.filter((i) => ["pizza", "pasta", "lasagna", "sandwich"].includes(i.cat));
  const drinks = ITEMS.filter((i) => ["coffee", "drinks"].includes(i.cat));
  const extras = ITEMS.filter((i) => ["desserts", "starters", "taglio"].includes(i.cat) && i.id !== "tray");
  const out = [];
  for (let g = 0; g < GUESTS; g++) {
    const female = rand() < 0.52;
    const name = `${pick(rand, female ? FEMALE : MALE)} ${pick(rand, LAST)}`;
    const joinedAgo = Math.floor(Math.pow(rand(), 1.6) * 700) + 2;          // most joined recently
    const rate = pick(rand, [0.4, 0.7, 1, 1.5, 2, 3, 4.5]);                  // visits a month
    const lapse = rand() < 0.22 ? 30 + Math.floor(rand() * 90) : 0;         // stopped coming this long ago
    const favMain = pick(rand, kitchen), favDrink = pick(rand, drinks);
    const visits = [];
    for (let d = Math.min(joinedAgo, SPAN); d >= 0; d--) {
      if (lapse && d < lapse) break;
      if (rand() >= rate / 30) continue;
      const party = 1 + Math.floor(rand() * rand() * 6);
      const items = [];
      for (let p = 0; p < party; p++) {
        items.push(rand() < 0.45 ? favMain.id : pick(rand, kitchen).id);
        items.push(rand() < 0.5 ? favDrink.id : pick(rand, drinks).id);
        if (rand() < 0.35) items.push(pick(rand, extras).id);
      }
      const hour = rand() < 0.34 ? 13 + Math.floor(rand() * 4) : 18 + Math.floor(rand() * 6);
      visits.push({
        day: d, min: hour * 60 + Math.floor(rand() * 4) * 15, party, items,
        spend: sum(items, (id) => byId(id).price),
        space: party >= 5 ? "friends" : "table",
      });
    }
    const jm = 1 + Math.floor(rand() * 12);
    out.push({
      id: `g${g + 1}`, name, female,
      mobile: `09${pick(rand, ["14", "12", "10", "35", "36", "01", "03", "19"])}${String(Math.floor(rand() * 1e7)).padStart(7, "0")}`,
      joinedAgo, birthday: { jm, jd: 1 + Math.floor(rand() * (jm <= 6 ? 31 : 29)) },
      visits, pizzaOpen: rand() < 0.12, spentShare: rand() * 0.4,
    });
  }
  return out;
}

const raw = () => (RAW ||= build());

function summarise(g, visits, now, today) {
  let lifetime = CLUB.welcome;
  for (const v of [...visits].reverse()) lifetime += Math.floor(v.spend / CLUB.tomanPerPoint * tierFor(lifetime).rate);
  const counts = new Map();
  visits.forEach((v) => v.items.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1)));
  const fav = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const last = visits[0]?.at || null;
  const sinceLast = last ? Math.round((today - startOfDay(last)) / DAY) : null;
  const bdayIn = g.birthday ? daysUntil(g.birthday.jm, g.birthday.jd, now) : 999;
  return { lifetime, fav, last, sinceLast, bdayIn, spent: sum(visits, (v) => v.spend), tier: tierFor(lifetime) };
}

function tagsOf(s, g, visits) {
  const tags = [];
  if (s.bdayIn <= 6) tags.push("birthday");
  if (g.joinedAgo != null && g.joinedAgo <= 30) tags.push("new");
  if (s.tier.id !== "amico") tags.push("vip");
  if (s.sinceLast != null && s.sinceLast >= 30 && visits.length >= 3) tags.push("lapsing");
  if (g.pizzaOpen) tags.push("pizza");
  return tags;
}

/** This phone's member, as the console would see them. */
function meGuest(now, today) {
  if (!store.isMember()) return null;
  const m = store.me();
  const mine = store.orders().filter((o) => o.member === m.id);
  const visits = mine.filter((o) => o.status === "served").map((o) => ({
    at: o.at, party: 1, items: o.lines.flatMap((l) => Array(l.qty).fill(l.id)), spend: o.total, space: "table",
  })).sort((a, b) => b.at - a.at);
  const joinedAgo = m.joined ? Math.round((today - startOfDay(m.joined)) / DAY) : 0;
  const g = { id: "me", name: m.name, mobile: m.mobile, joinedAgo, birthday: m.birthday, pizzaOpen: store.liveVouchers().some((v) => v.source === "stamps") };
  const s = summarise(g, visits, now, today);
  // the member record is the truth for points and tier, not the sample arithmetic
  s.lifetime = m.lifetime;
  s.tier = store.tierOf();
  return {
    ...g, visits, ...s, points: m.points, joined: m.joined, me: true,
    live: mine.filter((o) => o.status === "placed"), tags: ["me", ...tagsOf(s, g, visits)],
  };
}

/** Every guest, most recently seen first — this phone's member at the top. */
export function guestBook(now = new Date()) {
  const today = startOfDay(now);
  const t = now.getTime();
  const list = raw().map((g) => {
    const visits = g.visits
      .map((v) => ({ ...v, at: addDays(today, -v.day).getTime() + v.min * 60000 }))
      .filter((v) => v.at <= t)
      .sort((a, b) => b.at - a.at);
    const s = summarise(g, visits, now, today);
    return {
      ...g, visits, ...s, points: Math.max(0, Math.round(s.lifetime * (1 - g.spentShare))),
      joined: addDays(today, -g.joinedAgo).getTime(), tags: tagsOf(s, g, visits),
    };
  }).sort((a, b) => (b.last || 0) - (a.last || 0));
  const mine = meGuest(now, today);
  return mine ? [mine, ...list] : list;
}

export const guestById = (id, now = new Date()) => guestBook(now).find((g) => g.id === id) || null;

/* ------------------------------------------------------------------ today */
/** Before five in the morning the kitchen is still on yesterday's service. */
export function serviceDay(now = new Date()) {
  const late = now.getHours() < 5;
  return { day: startOfDay(late ? addDays(now, -1) : now), late };
}

function dayTotals(book, day, until = Infinity) {
  const a = day.getTime(), b = a + DAY;
  const visits = [];
  for (const g of book) for (const v of g.visits) if (v.at >= a && v.at < b && v.at <= until) visits.push({ ...v, guest: g });
  const revenue = sum(visits, (v) => v.spend);
  return { visits, revenue, covers: sum(visits, (v) => v.party), tickets: visits.length, avg: visits.length ? revenue / visits.length : 0 };
}

function sampleReservations(day) {
  const rand = rng(hash32("basil-res|" + dayKey(day)));
  const book = raw();
  const n = 4 + Math.floor(rand() * 5);
  const out = [];
  for (let i = 0; i < n; i++) {
    const g = book[Math.floor(rand() * book.length)];
    const space = pick(rand, ["table", "table", "table", "friends", "friends", "party"]);
    out.push({
      name: g.name, space, sample: true,
      guests: space === "party" ? 8 + Math.floor(rand() * 10) : space === "friends" ? 5 + Math.floor(rand() * 6) : 2 + Math.floor(rand() * 3),
      at: day.getTime() + (13 * 60 + Math.floor(rand() * 19) * 30) * 60000,
    });
  }
  return out.sort((x, y) => x.at - y.at);
}

export function today(now = new Date()) {
  const book = guestBook(now);
  const { day, late } = serviceDay(now);
  const cur = dayTotals(book, day, now.getTime());
  const lastWeekDay = addDays(day, -7);
  const lastWeek = dayTotals(book, lastWeekDay, late ? Infinity : lastWeekDay.getTime() + (now - startOfDay(now)));
  const bars = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(day, -i);
    bars.push({ day: d, revenue: dayTotals(book, d, i === 0 ? now.getTime() : Infinity).revenue, today: i === 0 });
  }
  const weekAgo = now.getTime() - 7 * DAY;
  const counts = new Map();
  for (const g of book) for (const v of g.visits) {
    if (v.at < weekAgo) break;
    v.items.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => ({ item: byId(id), n }));
  const seen30 = book.filter((g) => g.visits.some((v) => v.at >= now.getTime() - 30 * DAY));
  const back30 = seen30.filter((g) => g.visits.filter((v) => v.at >= now.getTime() - 30 * DAY).length >= 2);
  const mine = store.upcomingReservations().filter((r) => r.when >= day.getTime() && r.when < day.getTime() + DAY)
    .map((r) => ({ name: r.name, space: r.space, guests: r.guests, at: r.when, sample: false }));
  return {
    day, late, ...cur,
    delta: lastWeek.revenue ? (cur.revenue - lastWeek.revenue) / lastWeek.revenue : 0,
    bars, top,
    members: book.length,
    newThisWeek: book.filter((g) => g.joined >= now.getTime() - 7 * DAY).length,
    birthdays: book.filter((g) => g.tags.includes("birthday")).length,
    returning: seen30.length ? back30.length / seen30.length : 0,
    reservations: [...mine, ...sampleReservations(day)].sort((a, b) => a.at - b.at),
    live: book.find((g) => g.me)?.live || [],
  };
}

/* --------------------------------------------------------------- segments */
// The messages are drafted in Persian, because that is what a guest in Tabriz
// reads, with a merge field for the name — the way an SMS panel sends them.
export const SEGMENTS = [
  { id: "birthday", name: "Birthday this week", icon: "cake",
    why: "A tiramisu on the house brings them in for the day itself — usually with friends.",
    fa: "{نام} عزیز، تولدت مبارک! این هفته تیرامیسو در باسیل مهمان ما.",
    en: "Happy birthday, {name}! This week your tiramisu at Basil is on us." },
  { id: "lapsing", name: "Not seen in 30 days", icon: "clock",
    why: "Regulars who have gone quiet. The cheapest guest to win back.",
    fa: "{نام} عزیز، دلمان برایت تنگ شده. تا جمعه ۱۰٪ تخفیف روی پیتزا منتظرت است.",
    en: "We've missed you, {name}. 10% off any pizza is waiting until Friday." },
  { id: "vip", name: "Famiglia and Nonna", icon: "crown",
    why: "The guests who spend the most. First to taste a new pizza.",
    fa: "{نام} عزیز، پیتزای جدید باسیل را قبل از همه، این آخر هفته مهمان ما باش.",
    en: "{name}, taste Basil's new pizza before anyone else — this weekend, on us." },
  { id: "new", name: "Joined this month", icon: "sparkle",
    why: "A second visit in the first month is what turns a guest into a regular.",
    fa: "{نام} عزیز، به باشگاه باسیل خوش آمدی. هر پیتزا یک مهر؛ پیتزای هشتم مهمان ما.",
    en: "Welcome to Basil Club, {name}. A stamp for every pizza — the eighth is on us." },
  { id: "pizza", name: "Free pizza waiting", icon: "pizza",
    why: "Their stamp card is full and the pizza has not been claimed.",
    fa: "{نام} عزیز، کارت مهرت پر شده و یک پیتزا مهمان باسیل هستی. منتظرتیم!",
    en: "{name}, your stamp card is full — a pizza at Basil is on us. See you soon!" },
];

export function segments(now = new Date()) {
  const book = guestBook(now);
  return SEGMENTS.map((s) => ({ ...s, guests: book.filter((g) => g.tags.includes(s.id)) }));
}
