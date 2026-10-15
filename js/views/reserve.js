// Book — a table, the long friends' table, or a pizza party. Their "Friends"
// highlight is the friends' table made bookable; this takes all
// four, in the Persian calendar, and says plainly what happens next: Basil
// calls to confirm, and nothing is held until they do.

import { BUSINESS, RESERVE, SPACES } from "../config.js";
import { icon } from "../icons.js";
import { MONTHS, jLabel, jLabelFa, toJalali } from "../jalali.js";
import { haptic } from "../motion.js";
import { go, refresh } from "../router.js";
import * as store from "../store.js";
import { confirmSheet, emptyHTML, faHTML, noteHTML, qtyHTML, toast } from "../ui.js";
import {
  $, DAY, MONTHS_G, WEEKDAYS, WEEKDAYS_LONG, addDays, clockOf, dayKey, esc, gDate, hash32, hm,
  normMobile, plural, prettyMobile, startOfDay,
} from "../util.js";

const OCCASIONS = [
  { v: "", label: "No occasion" },
  { v: "birthday", label: "Birthday" },
  { v: "friends", label: "Friends' night" },
  { v: "date", label: "A date" },
  { v: "team", label: "Team dinner" },
];
const OCC_LABEL = Object.fromEntries(OCCASIONS.map((o) => [o.v, o.label]));

// what was chosen survives leaving and coming back
const draft = { space: "table", day: null, slot: null, guests: 2, occasion: "", name: "", mobile: "", note: "" };
const spaceOf = (id) => SPACES.find((s) => s.id === id) || SPACES[0];

/** Every half hour from noon to half past ten. The diary is seeded from the day
 *  and the room, so a slot that is full stays full on every reload. */
function slotsFor(dayTs, space, now = new Date()) {
  const out = [];
  for (let m = RESERVE.firstSlot; m <= RESERVE.lastSlot; m += RESERVE.step) {
    const at = dayTs + m * 60000;
    const past = at < now.getTime() + RESERVE.leadMinutes * 60000;
    const full = !past && hash32(`${dayKey(dayTs)}|${space}|${m}`) % 6 === 0;
    out.push({ m, at, past, full });
  }
  return out;
}

function bookableDays(now = new Date()) {
  const start = startOfDay(now);
  const out = [];
  for (let i = 0; out.length < RESERVE.days; i++) {
    const d = addDays(start, i);
    if (i === 0 && slotsFor(d.getTime(), draft.space, now).every((s) => s.past)) continue;
    out.push(d);
  }
  return out;
}

const spaceBtn = (s) => `
  <button class="space" type="button" role="radio" data-space="${s.id}" aria-checked="${draft.space === s.id}">
    <span class="space-ico">${icon(s.icon)}</span>
    <span class="space-t"><b>${esc(s.name)}</b>${faHTML(s.fa, " space-fa")}<small>${esc(s.note)}</small></span>
    <span class="space-cap">${s.min}–${s.max}</span>
  </button>`;

function dayBtn(d) {
  const j = toJalali(d);
  const diff = Math.round((d.getTime() - startOfDay(new Date()).getTime()) / DAY);
  const top = diff === 0 ? "Today" : diff === 1 ? "Tmrw" : WEEKDAYS[d.getDay()];
  return `<button class="day${d.getDay() === 5 ? " is-fri" : ""}" type="button" data-day="${d.getTime()}" aria-pressed="${d.getTime() === draft.day}"
    aria-label="${WEEKDAYS_LONG[d.getDay()]} ${jLabel(d)}"><small>${top}</small><b>${j.jd}</b></button>`;
}

const monthLabel = (ts) => {
  const d = new Date(ts), j = toJalali(d);
  return `${MONTHS[j.jm - 1]} ${j.jy} · ${MONTHS_G[d.getMonth()]} ${d.getFullYear()}`;
};

function slotsHTML() {
  return slotsFor(draft.day, draft.space).map((s) => `<button class="slot" type="button" data-slot="${s.m}" aria-pressed="${draft.slot === s.m}"${s.past || s.full ? " disabled" : ""}>${clockOf(s.m)}${s.full ? "<small>Full</small>" : ""}</button>`).join("");
}

export default function reserve(_, q) {
  if (q.space && SPACES.some((s) => s.id === q.space)) draft.space = q.space;
  const sp = spaceOf(draft.space);
  draft.guests = Math.min(sp.max, Math.max(sp.min, draft.guests));
  if (store.isMember()) {
    const m = store.me();
    if (!draft.name) draft.name = m.name;
    if (!draft.mobile) draft.mobile = prettyMobile(m.mobile);
  }
  const days = bookableDays();
  if (!draft.day || !days.some((d) => d.getTime() === draft.day)) { draft.day = days[0].getTime(); draft.slot = null; }
  const free = slotsFor(draft.day, draft.space).find((s) => s.m === draft.slot);
  if (!free || free.past || free.full) draft.slot = null;

  const html = `
    <div class="wrap">
      <header class="ph"><h1 class="lt">Book a table</h1>
        <p class="ph-sub">Tell Basil when. They confirm in your Instagram DMs or by text — nothing is held until they do.</p></header>

      <section class="sec">
        <div class="sec-head"><h2>Where</h2></div>
        <div class="spaces" role="radiogroup" aria-label="Where">${SPACES.map(spaceBtn).join("")}</div>
      </section>

      <section class="sec">
        <div class="sec-head"><h2>When</h2><span class="sub" id="days-month">${monthLabel(draft.day)}</span></div>
        <div class="days" id="days">${days.map(dayBtn).join("")}</div>
        <div class="slots" id="slots">${slotsHTML()}</div>
      </section>

      <section class="sec">
        <div class="sec-head"><h2>How many</h2><span class="sub" id="cap">${sp.min}–${sp.max} in the ${esc(sp.name.toLowerCase())}</span></div>
        <div class="party card"><b id="g-n">${plural(draft.guests, "guest")}</b>${qtyHTML(draft.guests, "Guests")}</div>
        <div class="chips chips--wrap" id="occ" aria-label="Occasion">${OCCASIONS.map((o) => `<button class="chip" type="button" data-occ="${o.v}" aria-pressed="${draft.occasion === o.v}">${esc(o.label)}</button>`).join("")}</div>
      </section>

      <section class="sec">
        <div class="sec-head"><h2>Who to call</h2></div>
        <div class="fields">
          <label class="field" id="f-name"><span class="field-l">Name</span>
            <input id="r-name" autocomplete="name" maxlength="40" value="${esc(draft.name)}" placeholder="First and last name"></label>
          <label class="field" id="f-mobile"><span class="field-l">Mobile</span>
            <input id="r-mobile" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" value="${esc(draft.mobile)}" placeholder="0914 123 4567"></label>
          <label class="field"><span class="field-l">Anything else?</span>
            <textarea id="r-note" rows="2" maxlength="240" placeholder="A cake, a high chair, the window table…">${esc(draft.note)}</textarea></label>
        </div>
        <p class="field-err" id="r-err" role="alert" hidden></p>
      </section>

      ${noteHTML("Preview: the request stays on this phone. A live version sends it to Basil, who confirm by message.", "phone")}
    </div>`;

  return {
    html,
    title: "Book",
    back: "#/",
    mount(screen, onCleanup) {
      const s$ = (sel) => screen.querySelector(sel);
      const dock = $("#dock");
      dock.innerHTML = `<div class="dock-sum"><small id="d-sub"></small><b id="d-t"></b></div>
        <button class="btn btn-primary" type="button" id="request">${icon("calendar")}<span>Request</span></button>`;
      dock.hidden = false;
      dock.dataset.for = "reserve";
      onCleanup(() => { dock.hidden = true; dock.innerHTML = ""; delete dock.dataset.for; });

      const paintDock = () => {
        const space = spaceOf(draft.space);
        if (draft.slot == null) {
          $("#d-t").textContent = space.name;
          $("#d-sub").textContent = "Choose a day and a time";
        } else {
          const at = draft.day + draft.slot * 60000;
          $("#d-t").textContent = `${WEEKDAYS[new Date(at).getDay()]} ${jLabel(at)} · ${clockOf(draft.slot)}`;
          $("#d-sub").textContent = `${space.name} · ${plural(draft.guests, "guest")}`;
        }
      };
      const paintSlots = () => {
        const ok = slotsFor(draft.day, draft.space).find((x) => x.m === draft.slot);
        if (!ok || ok.past || ok.full) draft.slot = null;
        s$("#slots").innerHTML = slotsHTML();
        s$("#slots").classList.remove("bad");
      };
      const paintGuests = () => {
        const space = spaceOf(draft.space);
        draft.guests = Math.min(space.max, Math.max(space.min, draft.guests));
        s$("#g-n").textContent = plural(draft.guests, "guest");
        s$(".party output").textContent = draft.guests;
        s$(".party [data-dec]").disabled = draft.guests <= space.min;
        s$(".party [data-inc]").disabled = draft.guests >= space.max;
        s$("#cap").textContent = `${space.min}–${space.max} in the ${space.name.toLowerCase()}`;
      };

      s$(".spaces").addEventListener("click", (e) => {
        const b = e.target.closest("[data-space]");
        if (!b) return;
        draft.space = b.dataset.space;
        haptic(6);
        screen.querySelectorAll("[data-space]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
        paintGuests();
        paintSlots();
        paintDock();
      });

      const strip = s$("#days");
      strip.addEventListener("click", (e) => {
        const b = e.target.closest("[data-day]");
        if (!b) return;
        draft.day = Number(b.dataset.day);
        haptic(5);
        strip.querySelectorAll("[data-day]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        s$("#days-month").textContent = monthLabel(draft.day);
        paintSlots();
        paintDock();
      });
      const onDay = strip.querySelector('[aria-pressed="true"]');
      if (onDay) strip.scrollLeft = Math.max(0, onDay.offsetLeft - strip.clientWidth / 2 + onDay.offsetWidth / 2);

      s$("#slots").addEventListener("click", (e) => {
        const b = e.target.closest("[data-slot]");
        if (!b || b.disabled) return;
        draft.slot = Number(b.dataset.slot);
        haptic(5);
        s$("#slots").querySelectorAll("[data-slot]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        s$("#slots").classList.remove("bad");
        s$("#r-err").hidden = true;
        paintDock();
      });

      s$(".party [data-dec]").addEventListener("click", () => { draft.guests -= 1; haptic(5); paintGuests(); paintDock(); });
      s$(".party [data-inc]").addEventListener("click", () => { draft.guests += 1; haptic(5); paintGuests(); paintDock(); });

      s$("#occ").addEventListener("click", (e) => {
        const b = e.target.closest("[data-occ]");
        if (!b) return;
        draft.occasion = b.dataset.occ;
        s$("#occ").querySelectorAll("[data-occ]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      });

      s$("#r-name").addEventListener("input", (e) => { draft.name = e.target.value; e.target.closest(".field").classList.remove("bad"); });
      s$("#r-mobile").addEventListener("input", (e) => { draft.mobile = e.target.value; e.target.closest(".field").classList.remove("bad"); });
      s$("#r-note").addEventListener("input", (e) => { draft.note = e.target.value; });

      $("#request").addEventListener("click", () => {
        const err = s$("#r-err");
        const fail = (msg, el) => {
          err.textContent = msg;
          err.hidden = false;
          el.classList.add("bad");
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          haptic([10, 40, 10]);
        };
        if (draft.slot == null) { fail("Choose a time for the booking.", s$("#slots")); toast("Choose a time first", { ico: "clock" }); return; }
        if (draft.name.trim().length < 2) return fail("We need a name for the booking.", s$("#f-name"));
        const mobile = normMobile(draft.mobile);
        if (!mobile) return fail("That doesn't look like an Iranian mobile — 11 digits, starting 09.", s$("#f-mobile"));
        const r = store.addReservation({
          space: draft.space, when: draft.day + draft.slot * 60000, guests: draft.guests,
          occasion: draft.occasion, name: draft.name, mobile, note: draft.note,
        });
        draft.slot = null;
        draft.note = "";
        draft.occasion = "";
        haptic([12, 40, 18]);
        toast("Booking requested", { ico: "calendar" });
        go(`#/reservation/${r.id}`);
      });

      paintGuests();
      paintDock();
    },
  };
}

/* ---------------------------------------------------------- one booking */
function icsText(r) {
  const s = spaceOf(r.space);
  const z = (t) => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Alpha Agency//Basil preview//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${r.id}@basil.preview`,
    `DTSTAMP:${z(Date.now())}`,
    `DTSTART:${z(r.when)}`,
    `DTEND:${z(r.when + 2 * 3600000)}`,
    `SUMMARY:Basil — ${s.name}`,
    `LOCATION:Basil · Pasta & Pizza\\, ${BUSINESS.street}\\, ${BUSINESS.city}`,
    `DESCRIPTION:${plural(r.guests, "guest")}. Reference ${r.ref}. Requested — Basil confirms by message.`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadICS(r) {
  const blob = new Blob([icsText(r)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `basil-${r.ref}.ics`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function reservationView({ id }) {
  const r = store.reservationById(id);
  if (!r) {
    return {
      title: "Booking", back: "#/profile",
      html: `<div class="wrap">${emptyHTML({ ico: "calendar", title: "No booking here", sub: "It may have been cleared from this phone.", cta: "Book a table", href: "#/reserve" })}</div>`,
    };
  }
  const s = spaceOf(r.space);
  const d = new Date(r.when);
  const live = r.status === "requested" && r.when > Date.now();
  const status = r.status === "cancelled" ? "Cancelled" : live ? "Requested" : "Visited";

  const html = `
    <div class="wrap">
      <header class="ph res-head">
        <span class="res-status res-status--${status.toLowerCase()}">${status}</span>
        <h1 class="lt">${esc(jLabel(r.when, { year: true }))}</h1>
        <p class="ph-sub">${WEEKDAYS_LONG[d.getDay()]} · ${hm(r.when)} · ${gDate(r.when)} ${d.getFullYear()}</p>
        ${faHTML(jLabelFa(r.when, { year: true }), " res-fa")}
      </header>

      <div class="list">
        <div class="row"><span class="row-ico">${icon(s.icon)}</span>
          <span class="row-body"><span class="row-title">${esc(s.name)}</span>${faHTML(s.fa, " row-fa")}</span></div>
        <div class="row"><span class="row-ico">${icon("users")}</span>
          <span class="row-body"><span class="row-title">${plural(r.guests, "guest")}</span>${r.occasion ? `<span class="row-sub">${esc(OCC_LABEL[r.occasion] || "")}</span>` : ""}</span></div>
        <div class="row"><span class="row-ico">${icon("user")}</span>
          <span class="row-body"><span class="row-title">${esc(r.name)}</span><span class="row-sub">${esc(prettyMobile(r.mobile))}</span></span></div>
        ${r.note ? `<div class="row"><span class="row-ico">${icon("note")}</span>
          <span class="row-body"><span class="row-title row-title--plain">${esc(r.note)}</span></span></div>` : ""}
        <div class="row"><span class="row-ico">${icon("ticket")}</span>
          <span class="row-body"><span class="row-title">Reference</span></span><span class="row-val" id="ref">${esc(r.ref)}</span></div>
      </div>

      ${live ? noteHTML("Basil confirms by message. Nothing is held until they do — if you haven't heard by the day, send them a DM.", "instagram") : ""}
      ${live && r.space === "party" ? noteHTML("A pizza party gets trays of square pizza in the middle. Mention a cake or the music in your note, or in the DM.", "cake") : ""}

      <div class="stack res-acts">
        <a class="btn btn-primary block" href="${BUSINESS.dm}" target="_blank" rel="noopener">${icon("instagram")}<span>Message Basil</span></a>
        <a class="btn btn-ghost block" href="${BUSINESS.maps}" target="_blank" rel="noopener">${icon("pin")}<span>Directions</span></a>
        ${live ? `<button class="btn btn-ghost block" type="button" data-ics>${icon("calendar")}<span>Add to calendar</span></button>
        <button class="btn btn-danger block" type="button" data-cancel>Cancel the request</button>` : ""}
      </div>
    </div>`;

  return {
    html,
    title: s.name,
    back: "#/profile",
    mount(screen) {
      screen.querySelector("[data-ics]")?.addEventListener("click", () => downloadICS(r));
      screen.querySelector("[data-cancel]")?.addEventListener("click", () => confirmSheet({
        title: "Cancel this request?",
        sub: `${s.name}, ${jLabel(r.when)} at ${hm(r.when)}. If Basil has already confirmed, let them know too.`,
        yes: "Cancel it", no: "Keep it", danger: true,
        onYes: () => { store.cancelReservation(r.id); toast("Request cancelled", { ico: "close" }); refresh(); },
      }));
    },
  };
}
