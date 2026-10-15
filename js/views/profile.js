// Profile — the guest's side of the club, and the door to the staff side.
//
// A guest who has not joined sees what Basil Club gives and one button. A member
// sees their card (with a QR the till can scan), their tier and how far to the
// next, the pizza stamp card, the vouchers waiting in the wallet, the rewards
// their leaves buy, their bookings and orders, every leaf in and out, their
// preferences and details. At the foot, for staff: the Basil CRM, the guest
// book this club builds.

import { BUSINESS, CLUB, REWARDS, SPACES } from "../config.js";
import { mark } from "../brand.js";
import { icon } from "../icons.js";
import { canPrompt, isIOS, promptInstall, standalone } from "../install.js";
import { MONTHS, jLabel } from "../jalali.js";
import { haptic, revealOn } from "../motion.js";
import { qrSVG } from "../qr.js";
import { refresh } from "../router.js";
import * as store from "../store.js";
import { setTheme, themePref } from "../theme.js";
import { closeSheet, confirmSheet, footer, noteHTML, openSheet, segHTML, tierChip, toast, wireSeg } from "../ui.js";
import { ago, compact, esc, firstName, gDate, hm, money, normMobile, plural, prettyMobile, sum } from "../util.js";
import { greeting, stampsHTML } from "./home.js";

/* ------------------------------------------------------------------ rows */
const RES_STATUS = { requested: "Requested", cancelled: "Cancelled", visited: "Visited" };

const resRow = (r) => {
  const s = SPACES.find((x) => x.id === r.space);
  return `<a class="row" href="#/reservation/${r.id}">
    <span class="row-ico">${icon(s?.icon || "calendar")}</span>
    <span class="row-body"><span class="row-title">${esc(jLabel(r.when))} · ${hm(r.when)}</span>
      <span class="row-sub">${esc(s?.name || "Table")} · ${plural(r.guests, "guest")} · ${RES_STATUS[r.status] || ""}</span></span>
    <span class="row-chev">${icon("chevron")}</span>
  </a>`;
};

const orderRow = (o) => `<a class="row" href="#/order/${o.id}">
  <span class="row-ico">${icon("receipt")}</span>
  <span class="row-body"><span class="row-title">Order ${esc(o.code)} · ${plural(sum(o.lines, (l) => l.qty), "item")}</span>
    <span class="row-sub">${gDate(o.at)} · ${hm(o.at)} · ${o.status === "served" ? "Served" : "In the oven"}${o.points ? ` · ${o.points} leaves` : ""}</span></span>
  <span class="row-val">${money(o.total)}</span>
  <span class="row-chev">${icon("chevron")}</span>
</a>`;

const ledgerRow = (h) => `<div class="row">
  <span class="row-body"><span class="row-title">${esc(h.why)}</span><span class="row-sub">${esc(ago(h.at))}</span></span>
  <span class="row-val pts ${h.pts < 0 ? "neg" : "pos"}">${h.pts > 0 ? "+" : "−"}${Math.abs(h.pts).toLocaleString("en-US")}</span>
</div>`;

/* -------------------------------------------------------------- sections */
function bookingsSection() {
  const up = store.upcomingReservations();
  const past = store.pastReservations().slice(0, 3);
  if (!up.length && !past.length && !store.isMember()) return "";
  return `<section class="sec reveal">
    <div class="sec-head"><h2>Bookings</h2><a class="more" href="#/reserve">Book</a></div>
    <div class="list">
      ${up.length ? up.map(resRow).join("") : `<a class="row" href="#/reserve"><span class="row-ico">${icon("calendar")}</span>
        <span class="row-body"><span class="row-title">Nothing booked</span><span class="row-sub">A table, the friends' table or a pizza party</span></span>
        <span class="row-chev">${icon("chevron")}</span></a>`}
      ${past.map(resRow).join("")}
    </div>
  </section>`;
}

function ordersSection() {
  const os = store.orders().slice(0, 5);
  if (!os.length) {
    return store.isMember()
      ? `<section class="sec reveal"><div class="sec-head"><h2>Orders</h2></div><p class="small muted">Your orders are listed here, with the leaves and stamps each one earned.</p></section>`
      : "";
  }
  return `<section class="sec reveal"><div class="sec-head"><h2>Orders</h2></div><div class="list">${os.map(orderRow).join("")}</div></section>`;
}

const crmCard = () => `<section class="sec reveal">
  <a class="crm-card" href="#/staff">
    <span class="crm-ico">${icon("chart")}</span>
    <span class="row-body"><span class="crm-kicker">For Basil staff</span><span class="row-title">Basil CRM</span>
      <span class="row-sub">The guest book this club builds: who comes, how often, which pizza they always order — and who to invite back.</span></span>
    <span class="row-chev">${icon("chevron")}</span>
  </a>
</section>`;

function settingsSection() {
  return `<section class="sec reveal">
    <div class="sec-head"><h2>Settings</h2></div>
    <div class="list">
      <div class="row row--block"><span class="row-title">Appearance</span>
        ${segHTML("Appearance", [{ v: "system", label: "System" }, { v: "light", label: "Light" }, { v: "dark", label: "Dark" }], themePref(), "seg--wide")}</div>
      ${standalone() ? "" : `<button class="row" type="button" data-install>
        <span class="row-ico">${icon("device")}</span>
        <span class="row-body"><span class="row-title">Add Basil to your Home Screen</span><span class="row-sub">It opens like an app, and works offline</span></span>
        <span class="row-chev">${icon("chevron")}</span></button>`}
      <a class="row" href="${BUSINESS.dm}" target="_blank" rel="noopener">
        <span class="row-ico">${icon("instagram")}</span>
        <span class="row-body"><span class="row-title">Message Basil</span><span class="row-sub">@${esc(BUSINESS.instagram)} on Instagram</span></span>
        <span class="row-chev">${icon("external")}</span></a>
    </div>
  </section>`;
}

/* ----------------------------------------------------------------- guest */
function guestScreen() {
  const rewardIcon = { item: "drink", cat: "dessert", pct: "ticket", service: "friends" };
  return `<div class="wrap">
    <header class="ph"><h1 class="lt">Profile</h1><p class="ph-sub">Your orders, bookings and the club — on this phone.</p></header>

    <section class="sec">
      <div class="club club--join">
        <span class="club-disc" aria-hidden="true">${mark({ tone: "disc", label: "" })}</span>
        <span class="club-kicker">Basil Club</span>
        <span class="club-title">Your number is your card.</span>
        <span class="club-lede">Join with your mobile — no account, no password. Show it at the counter, or order here and it counts by itself.</span>
        ${stampsHTML(0)}
        <ul class="club-perks">
          <li>${icon("pizza")}<span>A <b>stamp for every pizza</b> — the eighth is on us</span></li>
          <li>${icon("basil")}<span><b>${CLUB.welcome} leaves</b> the moment you join, a leaf for every 10,000 T</span></li>
          <li>${icon("dessert")}<span>A <b>tiramisu on the house</b> in your birthday week</span></li>
          <li>${icon("ticket")}<span>Leaves spent on <b>rewards</b>, up to a whole pizza</span></li>
        </ul>
        <button class="btn btn-gold block" type="button" data-join>${icon("basil")}<span>Join Basil Club</span></button>
      </div>
      ${noteHTML("Basil Club is a proposal from Alpha Agency. The leaves, stamps, tiers and rewards are ours until Basil sets their own.")}
    </section>

    <section class="sec reveal">
      <div class="sec-head"><h2>What leaves buy</h2></div>
      <div class="list">${REWARDS.map((r) => `<div class="row">
        <span class="row-ico">${icon(rewardIcon[r.kind])}</span>
        <span class="row-body"><span class="row-title">${esc(r.name)}</span><span class="row-sub">${esc(r.note)}</span></span>
        <span class="row-val row-val--leaf">${r.cost.toLocaleString("en-US")} ${icon("basil")}</span>
      </div>`).join("")}</div>
    </section>

    ${bookingsSection()}
    ${ordersSection()}
    ${crmCard()}
    ${settingsSection()}
    ${footer()}
  </div>`;
}

/* ---------------------------------------------------------------- member */
function memberScreen() {
  const m = store.me();
  const tier = store.tierOf(), next = store.nextTier();
  const pct = Math.round(store.tierProgress() * 100);
  const mine = store.orders().filter((o) => o.member === m.id);
  const served = mine.filter((o) => o.status === "served");
  const saved = sum(mine, (o) => o.discount || 0);
  const vouchers = store.liveVouchers();
  const left = store.stampsLeft();
  const rewardIcon = { item: "drink", cat: "dessert", pct: "ticket", service: "friends" };

  return `<div class="wrap">
    <header class="ph"><h1 class="lt">${esc(greeting())},<br>${esc(firstName(m.name))}</h1>
      <p class="ph-sub">Basil Club member since ${esc(jLabel(m.joined, { year: true }))}</p></header>

    <section class="sec">
      <div class="mcard" id="mcard">
        <span class="mcard-mark" aria-hidden="true">${mark({ label: "" })}</span>
        <div class="mcard-top"><span class="mcard-brand">BASIL <b>CLUB</b></span>${tierChip(tier)}</div>
        <div class="mcard-pts"><b id="m-points">${m.points.toLocaleString("en-US")}</b><span>leaves</span></div>
        <div class="mcard-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progress to ${esc(next ? next.name : tier.name)}"><i style="width:${pct}%"></i></div>
        <div class="mcard-next">${next ? `${(next.at - m.lifetime).toLocaleString("en-US")} leaves to ${esc(next.name)}` : "Nonna — the top of the family"}</div>
        <div class="mcard-foot">
          <span><small>Member</small><b>${esc(m.name)}</b></span>
          <span><small>No.</small><b>${esc(m.id)}</b></span>
          <button class="mcard-qr" type="button" data-qr aria-label="Show your member code">${icon("qr")}</button>
        </div>
      </div>
    </section>

    <section class="stats reveal">
      <div class="stat"><b>${served.length}</b><small>${served.length === 1 ? "order" : "orders"}</small></div>
      <div class="stat"><b>${m.cards}</b><small>${m.cards === 1 ? "free pizza" : "free pizzas"}</small></div>
      <div class="stat"><b>${saved ? compact(saved) : "0"}</b><small>Toman saved</small></div>
    </section>

    ${store.birthdayWeek() ? `<section class="sec reveal"><div class="bday">${icon("cake")}<div><b>Buon compleanno!</b><p>It's your birthday week — a tiramisu is on the house. Show your card at the counter.</p></div></div></section>` : ""}

    <section class="sec reveal">
      <a class="stampcard card" href="#/stamps">
        <span class="stampcard-top"><b>Pizza stamp card</b><span>${m.stamps} of ${CLUB.stampsPerCard}</span></span>
        ${stampsHTML(m.stamps)}
        <span class="stampcard-sub">${left === 1 ? "One more pizza and the next one is on us" : `${left} more pizzas to a pizza on us`}${m.cards ? ` · ${m.cards} filled so far` : ""}</span>
      </a>
    </section>

    <section class="sec reveal">
      <div class="sec-head"><h2>Wallet</h2>${vouchers.length ? `<span class="sub">${plural(vouchers.length, "voucher")}</span>` : ""}</div>
      ${vouchers.length ? `<div class="list" id="wallet">${vouchers.map((v) => `<div class="row">
        <span class="row-ico row-ico--gold">${icon(v.source === "stamps" ? "pizza" : "ticket")}</span>
        <span class="row-body"><span class="row-title">${esc(v.label)}</span>
          <span class="row-sub">${v.source === "stamps" ? "Stamp card" : "Reward"} · use by ${esc(jLabel(v.expires))}</span></span>
        ${v.kind === "service" ? `<span class="row-val">When you book</span>` : `<a class="btn btn-ghost sm" href="#/menu">Use</a>`}
      </div>`).join("")}</div>`
        : `<p class="small muted">Nothing waiting. A full stamp card and the rewards you redeem land here, and you apply them in your bag.</p>`}
    </section>

    <section class="sec reveal">
      <div class="sec-head"><h2>Rewards</h2><span class="sub">${m.points.toLocaleString("en-US")} leaves to spend</span></div>
      <div class="list">${REWARDS.map((r) => {
        const can = m.points >= r.cost;
        return `<div class="row">
          <span class="row-ico">${icon(rewardIcon[r.kind])}</span>
          <span class="row-body"><span class="row-title">${esc(r.name)}</span>
            <span class="row-sub">${esc(can ? r.note : `${(r.cost - m.points).toLocaleString("en-US")} more leaves`)}</span></span>
          <button class="btn ${can ? "btn-gold" : "btn-ghost"} sm" type="button" data-redeem="${r.id}" ${can ? "" : "disabled"}
            aria-label="Redeem ${esc(r.name)} for ${r.cost} leaves">${icon("basil")}<span>${r.cost.toLocaleString("en-US")}</span></button>
        </div>`;
      }).join("")}</div>
    </section>

    ${bookingsSection()}
    ${ordersSection()}

    <section class="sec reveal">
      <div class="sec-head"><h2>Leaves activity</h2></div>
      <div class="list">${m.history.slice(0, 8).map(ledgerRow).join("")}</div>
    </section>

    <section class="sec reveal">
      <div class="sec-head"><h2>${esc(tier.name)} perks</h2>${next ? `<span class="sub">${esc(next.name)} at ${next.at.toLocaleString("en-US")} leaves</span>` : ""}</div>
      <div class="card card-pad"><ul class="perks">${tier.perks.map((p) => `<li>${icon("check")}<span>${esc(p)}</span></li>`).join("")}</ul></div>
    </section>

    <section class="sec reveal">
      <div class="sec-head"><h2>Preferences</h2></div>
      <div class="list">
        <div class="row row--block"><span class="row-title">Where you like to sit</span>
          ${segHTML("Seating", [{ v: "any", label: "Anywhere" }, { v: "window", label: "Window" }, { v: "friends", label: "Long table" }], m.prefs.seating, "seg--wide")}</div>
        <div class="row row--block"><span class="row-title">How hot you like it</span>
          ${segHTML("Heat", [{ v: "mild", label: "Mild" }, { v: "medium", label: "Medium" }, { v: "hot", label: "Piccante" }], m.prefs.heat, "seg--wide")}</div>
        <div class="row"><span class="row-body"><span class="row-title">Offers by SMS</span><span class="row-sub">Your birthday week, new pizzas, the odd evening</span></span>
          <button class="switch" type="button" role="switch" aria-checked="${m.prefs.offers}" data-offers aria-label="Offers by SMS"></button></div>
      </div>
    </section>

    <section class="sec reveal">
      <div class="sec-head"><h2>Your details</h2><button class="more" type="button" data-edit>Edit</button></div>
      <div class="list">
        <div class="row"><span class="row-ico">${icon("user")}</span>
          <span class="row-body"><span class="row-title">${esc(m.name)}</span><span class="row-sub">${esc(prettyMobile(m.mobile))}</span></span></div>
        <div class="row"><span class="row-ico">${icon("cake")}</span>
          <span class="row-body"><span class="row-title">${m.birthday ? `${m.birthday.jd} ${MONTHS[m.birthday.jm - 1]}` : "Birthday not set"}</span>
            <span class="row-sub">${m.birthday ? (store.birthdayWeek() ? "It's your birthday week" : `In ${plural(store.birthdayIn(), "day")}`) : "Add it for the birthday tiramisu"}</span></span></div>
        <div class="row"><span class="row-ico">${icon("gift")}</span>
          <span class="row-body"><span class="row-title">Invite a friend</span><span class="row-sub">You both get ${CLUB.referral} leaves on their first order</span></span>
          <button class="btn btn-ghost sm" type="button" data-copy="${esc(m.referral)}">${icon("copy")}<span>${esc(m.referral)}</span></button></div>
      </div>
    </section>

    ${crmCard()}
    ${settingsSection()}

    <section class="sec reveal">
      <div class="stack">
        ${mine.length ? "" : `<button class="btn btn-ghost block" type="button" data-demo>${icon("refresh")}<span>Fill with sample history</span></button>`}
        <button class="btn btn-danger block" type="button" data-forget>${icon("logout")}<span>Leave Basil Club and clear this phone</span></button>
      </div>
      ${noteHTML("Basil Club is a proposal from Alpha Agency. The leaves, stamps, tiers and rewards are ours until Basil sets their own.")}
    </section>

    ${footer()}
  </div>`;
}

/* ---------------------------------------------------------------- sheets */
function detailsSheet({ edit = false } = {}) {
  const m = store.me();
  const bd = m.birthday;
  openSheet({
    title: edit ? "Your details" : "Join Basil Club",
    sub: edit ? "" : `${CLUB.welcome} leaves the moment you join — and a stamp for every pizza.`,
    label: edit ? "Your details" : "Join Basil Club",
    cls: "sheet--form",
    body: `
      <label class="field"><span class="field-l">Your name</span>
        <input id="j-name" autocomplete="name" maxlength="40" placeholder="First and last name" value="${esc(m.name)}"></label>
      <label class="field"><span class="field-l">Mobile</span>
        <input id="j-mobile" type="tel" inputmode="tel" autocomplete="tel" placeholder="0914 123 4567" value="${esc(m.mobile ? prettyMobile(m.mobile) : "")}">
        <span class="field-h">Your number is your card at the till.</span></label>
      <div class="field"><span class="field-l">Birthday <small>optional</small></span>
        <div class="field-row">
          <select id="j-day" aria-label="Birthday, day"><option value="">Day</option>${Array.from({ length: 31 }, (_, i) => i + 1).map((d) => `<option value="${d}"${bd?.jd === d ? " selected" : ""}>${d}</option>`).join("")}</select>
          <select id="j-month" aria-label="Birthday, month"><option value="">Month</option>${MONTHS.map((n, i) => `<option value="${i + 1}"${bd?.jm === i + 1 ? " selected" : ""}>${n}</option>`).join("")}</select>
        </div>
        <span class="field-h">In the Persian calendar. Your birthday week comes with a tiramisu on the house.</span></div>
      <p class="field-err" id="j-err" role="alert" hidden></p>
      ${edit ? "" : `<p class="small muted">Preview: nothing is sent and no one will text you. It all stays on this phone.</p>`}`,
    foot: `<button class="btn btn-primary block" type="button" id="j-go">${edit ? "Save" : "Join Basil Club"}</button>`,
    mount(sheet) {
      const $s = (s) => sheet.querySelector(s);
      const submit = () => {
        const name = $s("#j-name").value.trim();
        const mobile = normMobile($s("#j-mobile").value);
        const jd = Number($s("#j-day").value) || 0;
        const jm = Number($s("#j-month").value) || 0;
        const err = $s("#j-err");
        sheet.querySelectorAll(".field").forEach((f) => f.classList.remove("bad"));
        let msg = "";
        if (name.length < 2) { msg = "We need your name."; $s("#j-name").closest(".field").classList.add("bad"); }
        else if (!mobile) { msg = "That doesn't look like an Iranian mobile — 11 digits, starting 09."; $s("#j-mobile").closest(".field").classList.add("bad"); }
        else if (Boolean(jd) !== Boolean(jm)) msg = "Choose both the day and the month — or neither.";
        else if (jm >= 7 && jd === 31) msg = `${MONTHS[jm - 1]} has 30 days.`;
        if (msg) { err.textContent = msg; err.hidden = false; haptic([10, 40, 10]); return; }
        const birthday = jd && jm ? { jm, jd } : null;
        if (edit) {
          store.updateMember({ name, mobile, birthday });
          closeSheet();
          toast("Details saved");
          refresh();
          return;
        }
        store.join({ name, mobile, birthday });
        closeSheet();
        haptic([12, 40, 18]);
        toast(`+${CLUB.welcome} leaves — benvenuto to Basil Club`, { ico: "basil" });
        refresh();
      };
      $s("#j-go").addEventListener("click", submit);
      sheet.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.tagName === "INPUT") submit(); });
    },
  });
}

function qrSheet() {
  const m = store.me();
  openSheet({
    title: "Your Basil Club card",
    sub: "Show it at the counter or the kiosk to collect leaves and stamps, or to use a voucher.",
    label: "Your Basil Club card",
    cls: "sheet--qr",
    body: `<div class="qr-box">${qrSVG(`BASIL CLUB ${m.id}`, { quiet: 2, fg: "#02593D", bg: "#ffffff", label: `Member code ${m.id}` })}</div>
      <p class="qr-id">${esc(m.id)}</p><p class="qr-name">${esc(m.name)} · ${esc(store.tierOf().name)}</p>`,
  });
}

/* ------------------------------------------------------------------ view */
export default function profile(_, q) {
  const known = store.isMember();
  return {
    html: known ? memberScreen() : guestScreen(),
    title: known ? firstName(store.me().name) : "Profile",
    mount(screen, onCleanup) {
      onCleanup(revealOn(screen));
      const $ = (s) => screen.querySelector(s);

      screen.querySelectorAll(".seg").forEach((seg) => wireSeg(seg, (v) => {
        const kind = seg.dataset.seg;
        if (kind === "Appearance") setTheme(v);
        else if (kind === "Seating") store.setPrefs({ seating: v });
        else if (kind === "Heat") store.setPrefs({ heat: v });
      }));

      $("[data-join]")?.addEventListener("click", () => detailsSheet());
      $("[data-edit]")?.addEventListener("click", () => detailsSheet({ edit: true }));
      $("[data-qr]")?.addEventListener("click", qrSheet);
      $("[data-offers]")?.addEventListener("click", (e) => {
        const on = e.currentTarget.getAttribute("aria-checked") !== "true";
        e.currentTarget.setAttribute("aria-checked", String(on));
        haptic(6);
        store.setPrefs({ offers: on });
      });
      $("[data-copy]")?.addEventListener("click", async (e) => {
        const c = e.currentTarget.dataset.copy;
        try { await navigator.clipboard.writeText(c); toast("Invite code copied", { ico: "copy" }); }
        catch { toast(`Your invite code: ${c}`, { ico: "copy" }); }
      });
      $("[data-install]")?.addEventListener("click", async () => {
        if (canPrompt()) { if (await promptInstall()) toast("Added to your Home Screen"); return; }
        openSheet({
          title: "Add to Home Screen",
          body: `<p class="lede">${isIOS()
            ? "In Safari, tap the Share button, then Add to Home Screen."
            : "Open your browser's menu and choose Install app, or Add to Home Screen."}</p>`,
        });
      });
      $("[data-demo]")?.addEventListener("click", () => {
        const n = store.seedHistory();
        toast(`${plural(n, "past order")} added to your history`, { ico: "refresh" });
        refresh();
      });
      $("[data-forget]")?.addEventListener("click", () => confirmSheet({
        title: "Leave Basil Club?",
        sub: "Your leaves, stamps, vouchers, orders and bookings are erased from this phone. This can't be undone.",
        yes: "Leave and clear", danger: true,
        onYes: () => { store.forget(); toast("Cleared from this phone", { ico: "trash" }); refresh(); },
      }));

      screen.addEventListener("click", (e) => {
        const b = e.target.closest("[data-redeem]");
        if (!b || b.disabled) return;
        const r = store.reward(b.dataset.redeem);
        confirmSheet({
          title: r.name,
          sub: `${r.note}. ${r.cost.toLocaleString("en-US")} leaves come off your balance now; the voucher waits in your wallet for 30 days.`,
          yes: "Redeem",
          onYes: () => {
            if (store.redeem(r.id)) { toast(`${r.name} — in your wallet`, { ico: "ticket" }); refresh(); }
          },
        });
      });

      // arriving from "Join Basil Club" elsewhere: open the sheet, then drop the flag
      if (q.join === "1") {
        history.replaceState(history.state, "", "#/profile");
        if (!store.isMember()) setTimeout(() => detailsSheet(), 320);
      }
    },
  };
}
