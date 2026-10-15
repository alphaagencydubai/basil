// Basil CRM — the staff side of the club.
//
// Behind a passcode. The preview's passcode is printed on the lock, because it
// guards nothing: the book is sample data. Three views:
//
//   TODAY      the service so far against the same day last week, fourteen
//              days of takings, what the kitchen is selling, the bookings, and
//              anything on the pass from this phone
//   GUESTS     the book, searchable, filtered by the tags the club's own data
//              raises — birthday this week, Famiglia and Nonna, lapsing, new
//   CAMPAIGNS  the groups worth a message, each with the message drafted in
//              Persian, the way a guest in Tabriz reads it
//
// Nothing is sent from a preview, and every send says so.

import { SPACES, STAFF } from "../config.js";
import { byId } from "../data.js";
import * as crm from "../crm.js";
import { mark } from "../brand.js";
import { icon } from "../icons.js";
import { MONTHS, jLabel } from "../jalali.js";
import { haptic, replay } from "../motion.js";
import { refresh } from "../router.js";
import * as store from "../store.js";
import { closeSheet, faHTML, noteHTML, openSheet, segHTML, tierChip, toast, wireSeg } from "../ui.js";
import { WEEKDAYS, WEEKDAYS_LONG, ago, compact, esc, firstName, gDate, hm, initials, maskMobile, money, plural, sum } from "../util.js";

const KEY = "basil.staff";
let opened = false;          // survives a blocked sessionStorage
let tab = "today";
let filter = "all";
let term = "";
const scheduled = {};

const unlocked = () => {
  if (opened) return true;
  try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; }
};

const TAG_LABEL = {
  me: "This phone", birthday: "Birthday this week", vip: "Famiglia & Nonna",
  lapsing: "Not seen in 30 days", new: "Joined this month", pizza: "Free pizza waiting",
};
const FILTERS = [
  { id: "all", label: "All" }, { id: "me", label: "This phone" }, { id: "birthday", label: "Birthday" },
  { id: "vip", label: "Famiglia & Nonna" }, { id: "lapsing", label: "Lapsing" }, { id: "new", label: "New" },
];
const STAGES = ["Received", "In the oven", "Ready", "Served"];
const WHEN = { now: "now", tomorrow: "tomorrow at 11:00", friday: "Friday at 18:00" };

/* ------------------------------------------------------------------- lock */
function lockScreen() {
  return `<div class="wrap lock">
    <div class="lock-mark">${mark({ label: "" })}</div>
    <h1 class="lt">Basil CRM</h1>
    <p class="ph-sub">For staff. Enter the passcode.</p>
    <div class="pin" id="pin" role="img" aria-label="Passcode, 0 of 4 digits">${"<i></i>".repeat(4)}</div>
    <p class="pin-err" id="pin-err" role="alert" hidden>That's not it — try again.</p>
    <div class="keypad" id="keypad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k) => (k === ""
      ? "<span></span>"
      : `<button type="button" data-k="${k}" aria-label="${k === "del" ? "Delete" : k}">${k === "del" ? icon("back") : k}</button>`)).join("")}</div>
    <p class="lock-hint">Preview passcode: <b>${STAFF.passcode}</b></p>
  </div>`;
}

function wireLock(screen, onCleanup) {
  let code = "";
  const pin = screen.querySelector("#pin"), err = screen.querySelector("#pin-err");
  const paint = () => {
    [...pin.children].forEach((dot, i) => dot.classList.toggle("on", i < code.length));
    pin.setAttribute("aria-label", `Passcode, ${code.length} of 4 digits`);
  };
  const press = (k) => {
    if (k === "del") { code = code.slice(0, -1); err.hidden = true; paint(); return; }
    if (code.length >= 4) return;
    code += k;
    haptic(5);
    paint();
    if (code.length < 4) return;
    if (code === STAFF.passcode) {
      opened = true;
      try { sessionStorage.setItem(KEY, "1"); } catch {}
      setTimeout(refresh, 160);
    } else {
      err.hidden = false;
      replay(pin, "shake");
      haptic([30, 40, 30]);
      setTimeout(() => { code = ""; paint(); }, 420);
    }
  };
  screen.querySelector("#keypad").addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (b) press(b.dataset.k);
  });
  const onKey = (e) => {
    if (e.target.closest?.("input, textarea")) return;
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") press("del");
  };
  document.addEventListener("keydown", onKey);
  onCleanup(() => document.removeEventListener("keydown", onKey));
}

/* ------------------------------------------------------------------ today */
function todayPane() {
  const now = new Date();
  const t = crm.today(now);
  const wd = t.day.getDay();
  const label = `${t.late ? "Last service" : "Today so far"} · ${WEEKDAYS_LONG[wd]} ${jLabel(t.day)}`;
  const max = Math.max(1, ...t.bars.map((b) => b.revenue));
  const pct = Math.round(Math.abs(t.delta) * 100);
  return `
    <p class="pane-label">${esc(label)}</p>
    <div class="kpis">
      <div class="kpi kpi--wide"><small>Takings</small><b>${compact(t.revenue)}<span> T</span></b>
        <em class="${t.delta >= 0 ? "up" : "down"}">${t.delta >= 0 ? "+" : "−"}${pct}% on last ${WEEKDAYS_LONG[wd]}</em></div>
      <div class="kpi"><small>Tickets</small><b>${t.tickets}</b></div>
      <div class="kpi"><small>Covers</small><b>${t.covers}</b></div>
      <div class="kpi"><small>Average ticket</small><b>${compact(t.avg)}<span> T</span></b></div>
      <div class="kpi"><small>Back within 30 days</small><b>${Math.round(t.returning * 100)}%</b></div>
    </div>

    <section class="sec">
      <div class="sec-head"><h2>Takings, 14 days</h2><span class="sub">best ${compact(max)} T</span></div>
      <div class="bars card" role="img" aria-label="Takings for each of the last fourteen days">
        ${t.bars.map((b) => `<div class="bar${b.today ? " is-today" : ""}"><i style="--h:${Math.max(0.03, b.revenue / max).toFixed(3)}"></i><small>${WEEKDAYS[b.day.getDay()].slice(0, 1)}</small></div>`).join("")}
      </div>
    </section>

    ${t.live.length ? `<section class="sec">
      <div class="sec-head"><h2>On the pass</h2><span class="sub">from this phone</span></div>
      <div class="list">${t.live.map((o) => `<a class="row" href="#/order/${o.id}">
        <span class="rank">${esc(o.code)}</span>
        <span class="row-body"><span class="row-title">${plural(sum(o.lines, (l) => l.qty), "item")} · ${o.mode === "table" ? (o.table ? `table ${esc(o.table)}` : "to a table") : "takeaway"}</span>
          <span class="row-sub">${STAGES[store.orderStage(o)]} · placed ${hm(o.at)}</span></span>
        <span class="row-val">${money(o.total)}</span></a>`).join("")}</div>
    </section>` : ""}

    <section class="sec">
      <div class="sec-head"><h2>Selling this week</h2></div>
      <div class="list top">${t.top.map((x, i) => `<div class="row">
        <span class="rank">${i + 1}</span>
        <span class="row-body"><span class="row-title">${esc(x.item.name)}</span>${faHTML(x.item.fa, " row-fa")}</span>
        <span class="row-val">${x.n} sold</span></div>`).join("")}</div>
    </section>

    <section class="sec">
      <div class="sec-head"><h2>${t.late ? "Bookings that evening" : "Bookings today"}</h2><span class="sub">${t.reservations.length}</span></div>
      <div class="list">${t.reservations.map((r) => {
        const s = SPACES.find((x) => x.id === r.space);
        return `<div class="row">
          <span class="time">${hm(r.at)}</span>
          <span class="row-body"><span class="row-title">${esc(r.name)}${r.sample ? "" : ' <span class="tag">This phone</span>'}</span>
            <span class="row-sub">${esc(s?.name || "Table")} · ${plural(r.guests, "guest")}</span></span>
          <span class="row-ico">${icon(s?.icon || "table")}</span></div>`;
      }).join("")}</div>
    </section>

    <div class="kpis kpis--3">
      <div class="kpi"><small>Members</small><b>${t.members}</b></div>
      <div class="kpi"><small>New this week</small><b>${t.newThisWeek}</b></div>
      <div class="kpi"><small>Birthdays this week</small><b>${t.birthdays}</b></div>
    </div>
    ${noteHTML("Sample data: 164 made-up guests, the same on every phone. Only this phone's own member, orders and bookings are real.")}`;
}

/* ----------------------------------------------------------------- guests */
const guestRow = (g) => `<button class="row guest" type="button" data-g="${g.id}" data-tags="${g.tags.join(" ")}"
  data-q="${esc(g.name.toLowerCase())} ${esc(String(g.mobile).slice(-4))}">
  <span class="av av--${g.tier.id}">${esc(initials(g.name))}</span>
  <span class="row-body"><span class="row-title">${esc(g.name)}${g.me ? ' <span class="tag">This phone</span>' : ""}</span>
    <span class="row-sub">${esc(g.tier.name)} · ${plural(g.visits.length, "visit")} · ${g.last ? esc(ago(g.last)) : "no visits yet"}</span></span>
  <span class="row-val">${compact(g.spent)}</span>
</button>`;

function guestsPane() {
  const book = crm.guestBook(new Date());
  const count = (id) => (id === "all" ? book.length : book.filter((g) => g.tags.includes(id)).length);
  return `
    <label class="search">${icon("search")}<input id="g-q" type="search" placeholder="Search by name or the last 4 digits" value="${esc(term)}" autocomplete="off" aria-label="Search guests"></label>
    <div class="chips chips--wrap" id="g-chips">${FILTERS.filter((f) => f.id !== "me" || count("me")).map((f) => `<button class="chip" type="button" data-f="${f.id}" aria-pressed="${filter === f.id}">${esc(f.label)}<small>${count(f.id)}</small></button>`).join("")}</div>
    <div class="list guests" id="g-list">${book.map(guestRow).join("")}</div>
    <p class="empty-s" id="g-none" hidden>No guest matches that.</p>`;
}

function applyGuests(screen) {
  const rows = screen.querySelectorAll("#g-list .guest");
  const q = term.trim().toLowerCase();
  let shown = 0;
  rows.forEach((r) => {
    const ok = (filter === "all" || r.dataset.tags.split(" ").includes(filter)) && (!q || r.dataset.q.includes(q));
    r.hidden = !ok;
    if (ok) shown++;
  });
  screen.querySelector("#g-none").hidden = shown > 0;
}

function guestSheet(id) {
  const g = crm.guestById(id, new Date());
  if (!g) return;
  const fav = g.fav ? byId(g.fav) : null;
  const avg = g.visits.length ? g.spent / g.visits.length : 0;
  const topOf = (items) => {
    const c = new Map();
    items.forEach((x) => c.set(x, (c.get(x) || 0) + 1));
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([x]) => byId(x)?.name).filter(Boolean).join(", ");
  };
  openSheet({
    label: g.name,
    cls: "sheet--guest",
    body: `
      <div class="guest-head"><span class="av av--lg av--${g.tier.id}">${esc(initials(g.name))}</span>
        <div><h2 class="sheet-title">${esc(g.name)}</h2><p class="sheet-sub">${tierChip(g.tier)} <span>${esc(maskMobile(g.mobile))}</span></p></div></div>
      <div class="kpis kpis--3">
        <div class="kpi"><small>Visits</small><b>${g.visits.length}</b></div>
        <div class="kpi"><small>Spent</small><b>${compact(g.spent)}</b></div>
        <div class="kpi"><small>Leaves</small><b>${g.points.toLocaleString("en-US")}</b></div>
      </div>
      <div class="list">
        <div class="row"><span class="row-ico">${icon("calendar")}</span><span class="row-body"><span class="row-title">Member since</span></span><span class="row-val">${esc(jLabel(g.joined, { year: true }))}</span></div>
        ${g.birthday ? `<div class="row"><span class="row-ico">${icon("cake")}</span><span class="row-body"><span class="row-title">Birthday</span></span><span class="row-val">${g.birthday.jd} ${MONTHS[g.birthday.jm - 1]}${g.bdayIn <= 6 ? " · this week" : ""}</span></div>` : ""}
        ${fav ? `<div class="row"><span class="row-ico">${icon("heart")}</span><span class="row-body"><span class="row-title">Usually orders</span></span><span class="row-val">${esc(fav.name)}</span></div>` : ""}
        <div class="row"><span class="row-ico">${icon("receipt")}</span><span class="row-body"><span class="row-title">Average ticket</span></span><span class="row-val">${money(avg)} T</span></div>
        <div class="row"><span class="row-ico">${icon("clock")}</span><span class="row-body"><span class="row-title">Last visit</span></span><span class="row-val">${g.last ? esc(ago(g.last)) : "—"}</span></div>
      </div>
      ${g.tags.filter((x) => x !== "me").length ? `<div class="tags">${g.tags.filter((x) => x !== "me").map((x) => `<span class="tag tag--${x}">${esc(TAG_LABEL[x])}</span>`).join("")}</div>` : ""}
      <section class="sec">
        <div class="sec-head"><h2>Recent visits</h2></div>
        ${g.visits.length ? `<div class="list">${g.visits.slice(0, 6).map((v) => `<div class="row">
          <span class="row-body"><span class="row-title">${gDate(v.at)} · ${hm(v.at)}</span>
            <span class="row-sub">${plural(v.party, "guest")} · ${esc(topOf(v.items))}</span></span>
          <span class="row-val">${compact(v.spend)}</span></div>`).join("")}</div>` : `<p class="small muted">No visits yet.</p>`}
      </section>`,
    foot: `<button class="btn btn-primary block" type="button" data-offer>${icon("send")}<span>Send ${esc(firstName(g.name))} an offer</span></button>`,
    mount(sheet) {
      sheet.querySelector("[data-offer]").addEventListener("click", () => composer({
        title: `An offer for ${firstName(g.name)}`, count: 1,
        fa: "{نام} عزیز، این هفته در باسیل یک تیرامیسو مهمان ما هستی.",
        en: "{name}, this week there's a tiramisu on us at Basil.",
      }));
    },
  });
}

/* -------------------------------------------------------------- campaigns */
function campaignsPane() {
  const segs = crm.segments(new Date());
  return `
    <p class="pane-label">Groups worth a message this week</p>
    ${segs.map((s) => `<article class="camp card">
      <div class="camp-head">
        <span class="camp-ico">${icon(s.icon)}</span>
        <span class="row-body"><span class="row-title">${esc(s.name)}</span><span class="row-sub">${esc(s.why)}</span></span>
        <span class="camp-n">${s.guests.length}</span>
      </div>
      <div class="camp-msg">${faHTML(s.fa, " camp-fa")}<p class="camp-en">${esc(s.en)}</p></div>
      <div class="camp-foot">
        ${scheduled[s.id]
          ? `<span class="camp-done">${icon("check")}<span>Scheduled ${esc(WHEN[scheduled[s.id]])}</span></span>`
          : `<span class="avs">${s.guests.slice(0, 5).map((g) => `<span class="av av--sm av--${g.tier.id}">${esc(initials(g.name))}</span>`).join("")}</span>`}
        <button class="btn btn-gold sm" type="button" data-camp="${s.id}"${s.guests.length ? "" : " disabled"}>Prepare</button>
      </div>
    </article>`).join("")}
    ${noteHTML("Messages go out in Persian with each guest's first name merged in. Nothing is sent from the preview.")}`;
}

function composer({ seg = null, title, count, fa, en }) {
  let when = "tomorrow";
  openSheet({
    title: esc(title),
    sub: `${plural(count, "guest")} · by SMS`,
    label: title,
    cls: "sheet--compose",
    body: `
      <label class="field"><span class="field-l">Message, in Persian</span>
        <textarea id="c-fa" class="fa-input" dir="rtl" lang="fa" rows="4">${esc(fa)}</textarea>
        <span class="field-h">{نام} becomes each guest's first name.</span></label>
      <p class="compose-en"><small>In English</small>${esc(en)}</p>
      <div class="field"><span class="field-l">When</span>
        ${segHTML("When", [{ v: "now", label: "Now" }, { v: "tomorrow", label: "Tomorrow 11:00" }, { v: "friday", label: "Friday 18:00" }], when, "seg--wide")}</div>
      ${noteHTML("Preview: nothing is sent. A live Basil CRM sends this through their SMS panel.")}`,
    foot: `<button class="btn btn-primary block" type="button" data-send>${icon("send")}<span>Schedule</span></button>`,
    mount(sheet) {
      const btn = sheet.querySelector("[data-send] span");
      wireSeg(sheet.querySelector(".seg"), (v) => { when = v; btn.textContent = v === "now" ? "Send" : "Schedule"; });
      sheet.querySelector("[data-send]").addEventListener("click", () => {
        if (seg) scheduled[seg] = when;
        closeSheet();
        haptic([12, 40, 18]);
        toast(`${when === "now" ? "Sent" : `Scheduled ${WHEN[when]}`} — in the preview, nothing leaves`, { ico: "send", ms: 3200 });
        document.dispatchEvent(new CustomEvent("crm:scheduled"));
      });
    },
  });
}

/* ------------------------------------------------------------------- view */
function paneHTML() {
  if (tab === "guests") return guestsPane();
  if (tab === "campaigns") return campaignsPane();
  return todayPane();
}

function wirePane(screen) {
  if (tab === "guests") {
    const input = screen.querySelector("#g-q");
    input.addEventListener("input", () => { term = input.value; applyGuests(screen); });
    screen.querySelector("#g-chips").addEventListener("click", (e) => {
      const b = e.target.closest("[data-f]");
      if (!b) return;
      filter = b.dataset.f;
      haptic(5);
      screen.querySelectorAll("#g-chips [data-f]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      applyGuests(screen);
    });
    screen.querySelector("#g-list").addEventListener("click", (e) => {
      const r = e.target.closest("[data-g]");
      if (r) guestSheet(r.dataset.g);
    });
    applyGuests(screen);
  }
  if (tab === "campaigns") {
    screen.querySelector("#pane").addEventListener("click", (e) => {
      const b = e.target.closest("[data-camp]");
      if (!b) return;
      const s = crm.segments(new Date()).find((x) => x.id === b.dataset.camp);
      composer({ seg: s.id, title: s.name, count: s.guests.length, fa: s.fa, en: s.en });
    });
  }
}

export default function staff() {
  if (!unlocked()) {
    return {
      html: lockScreen(),
      title: "Basil CRM",
      back: "#/profile",
      mount: (screen, onCleanup) => wireLock(screen, onCleanup),
    };
  }
  const html = `<div class="wrap crm">
    <header class="ph ph--row">
      <div><h1 class="lt">Basil CRM</h1><p class="ph-sub">Sample guest book · preview data</p></div>
      <button class="btn btn-ghost sm" type="button" data-lock>${icon("lock")}<span>Lock</span></button>
    </header>
    ${segHTML("View", [{ v: "today", label: "Today" }, { v: "guests", label: "Guests" }, { v: "campaigns", label: "Campaigns" }], tab, "seg--wide crm-tabs")}
    <div id="pane">${paneHTML()}</div>
  </div>`;
  return {
    html,
    title: "Basil CRM",
    back: "#/profile",
    mount(screen, onCleanup) {
      const repaint = () => {
        // Look the pane up again every time. A reference taken once points at
        // the node the FIRST repaint detached, so the second switch replaces
        // something that is no longer in the document and nothing happens.
        const pane = screen.querySelector("#pane");
        const next = pane.cloneNode(false);   // a fresh node: the pane's listeners never stack
        next.innerHTML = paneHTML();
        pane.replaceWith(next);
        wirePane(screen);
      };
      wireSeg(screen.querySelector(".crm-tabs"), (v) => { tab = v; repaint(); });
      screen.querySelector("[data-lock]").addEventListener("click", () => {
        opened = false;
        try { sessionStorage.removeItem(KEY); } catch {}
        refresh();
      });
      const onScheduled = () => { if (tab === "campaigns") repaint(); };
      document.addEventListener("crm:scheduled", onScheduled);
      onCleanup(() => document.removeEventListener("crm:scheduled", onScheduled));
      wirePane(screen);
    },
  };
}
