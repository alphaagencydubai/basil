// Home — Basil at a glance, in their own colours: the aqua of their avatar, the
// green of their hand, the doodles of their highlights. Their mark snaps, their
// line «باسیل؛ به وقت ایتالیا» is taken at its word with Tabriz and Rome side by
// side, then what comes out of the oven, the kiosk you can skip, the stamp card,
// the friends' table, their words, and how to find them.

import { BUSINESS, CLUB, SPACES } from "../config.js";
import { CATEGORIES, SIGNATURES, byId } from "../data.js";
import { mark } from "../brand.js";
import { DOODLES, doodle } from "../doodles.js";

const doodleBody = (n) => DOODLES[n] || "";
import { icon } from "../icons.js";
import { reduced, revealOn } from "../motion.js";
import * as store from "../store.js";
import { addHTML, artHTML, faHTML, footer, photoHTML, tierChip, wireImages } from "../ui.js";
import { esc, firstName, pad2, priceHTML } from "../util.js";

const GRAM = ["pizza-ham", "kiosk", "focaccia", "storefront", "guest", "pepperoni"];

/* ------------------------------------------------------------------ time */
// Their bio is "Basil — on Italy time". The opening state is Tabriz's clock,
// whatever zone the phone looking at it is in.
const zoneParts = (tz, now = new Date()) => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const v = (t) => Number(p.find((x) => x.type === t)?.value || 0);
  return { h: v("hour") % 24, m: v("minute") };
};
export const tabrizNow = (now = new Date()) => {
  try { return zoneParts("Asia/Tehran", now); } catch { return { h: now.getHours(), m: now.getMinutes() }; }
};
const romeNow = (now = new Date()) => {
  try { return zoneParts("Europe/Rome", now); } catch { return null; }
};
const hhmm = (t) => (t ? `${pad2(t.h)}:${pad2(t.m)}` : "—");

export function openState(now = new Date()) {
  const { h, m } = tabrizNow(now);
  const mins = h * 60 + m;
  if (mins >= 13 * 60) return { open: true, text: "Open now · until midnight" };
  return { open: false, text: "Closed now · opens at 13:00" };
}

export function greeting(now = new Date()) {
  const { h } = tabrizNow(now);
  if (h >= 5 && h < 12) return "Buongiorno";
  if (h >= 12 && h < 18) return "Buon pomeriggio";
  return "Buonasera";
}

/* ---------------------------------------------------------------- pieces */
const dish = (it) => `
  <article class="dish" data-item="${it.id}" tabindex="0" aria-label="${esc(it.name)}">
    <div class="dish-media">${it.thumb ? photoHTML(it.thumb, { sizes: "220px", lazy: false, alt: it.name }) : artHTML(it)}
      ${it.tag ? `<span class="tag dish-tag${it.hot ? " tag--hot" : ""}">${esc(it.tag)}</span>` : ""}</div>
    <div class="dish-body">
      <div class="dish-name">${esc(it.name)}</div>
      ${faHTML(it.fa, " dish-fa")}
      <div class="dish-foot">${priceHTML(it.price)}${addHTML(it)}</div>
    </div>
  </article>`;

/** The stamp card, eight discs; the filled ones carry a pizza. */
export function stampsHTML(n = 0, { big = false } = {}) {
  return `<div class="stamps${big ? " stamps--big" : ""}" role="img" aria-label="${n} of ${CLUB.stampsPerCard} pizza stamps">
    ${Array.from({ length: CLUB.stampsPerCard }, (_, i) => {
      const last = i === CLUB.stampsPerCard - 1;
      return `<span class="stamp${i < n ? " on" : ""}${last ? " last" : ""}" style="--i:${i}">${i < n ? doodle("pizza", { stroke: 2.8 }) : last ? `<b>FREE</b>` : `<i>${i + 1}</i>`}</span>`;
    }).join("")}
  </div>`;
}

function clubCard() {
  if (!store.isMember()) {
    return `<a class="club reveal" href="#/profile?join=1">
      <span class="club-disc" aria-hidden="true">${mark({ tone: "disc", label: "" })}</span>
      <span class="club-kicker">Basil Club</span>
      <span class="club-title">A stamp for every pizza. The eighth is on us.</span>
      ${stampsHTML(0)}
      <span class="club-lede">${CLUB.welcome} leaves to start, a leaf for every 10,000 T, and a tiramisu in your birthday week.</span>
      <span class="btn btn-gold sm club-cta">${icon("basil")}<span>Join with your mobile</span></span>
    </a>`;
  }
  const m = store.me();
  const tier = store.tierOf();
  const left = store.stampsLeft();
  return `<div class="club reveal">
    <span class="club-disc" aria-hidden="true">${mark({ tone: "disc", label: "" })}</span>
    <span class="club-top"><span class="club-kicker">Basil Club</span>${tierChip(tier)}</span>
    <span class="club-title">${esc(greeting())}, ${esc(firstName(m.name))}.</span>
    <a class="club-stamps" href="#/stamps">${stampsHTML(m.stamps)}</a>
    <span class="club-next">${left === 1 ? "One more pizza and the next one is ours" : `${left} more pizzas to a pizza on us`}</span>
    <span class="club-actions">
      <a class="btn btn-gold sm" href="#/profile">${icon("basil")}<span>${m.points.toLocaleString("en-US")} leaves</span></a>
      <a class="btn btn-glass sm" href="#/stamps">Stamp card</a>
    </span>
  </div>`;
}

/** Valiasr and Roudaki, drawn rather than photographed: where they cross is where Basil is. */
function mapSVG() {
  return `<svg class="map" viewBox="0 0 360 190" aria-hidden="true" focusable="false">
    <path class="road" d="M-20 132 C 90 122 220 112 380 98" stroke-width="22"/>
    <path class="road" d="M212 -20 C 206 60 200 130 194 210" stroke-width="15"/>
    <path class="road" d="M-20 40 C 60 46 140 50 214 52" stroke-width="7"/>
    <path class="road" d="M300 -10 C 296 60 292 130 290 210" stroke-width="7"/>
    <path class="road" d="M80 -10 C 84 50 88 90 92 128" stroke-width="7"/>
    <path class="lane" d="M-20 132 C 90 122 220 112 380 98"/>
    <text transform="translate(26 152) rotate(-3)">VALIASR</text>
    <text transform="translate(218 24) rotate(87)">ROUDAKI</text>
    <g transform="translate(175 74)" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <g transform="scale(.9)">${doodleBody("pin")}</g>
    </g>
    <g class="pin-badge" transform="translate(222 70)"><rect width="58" height="24" rx="12"/><text x="29" y="16.5" text-anchor="middle">Basil</text></g>
  </svg>`;
}

/* ------------------------------------------------------------------ view */
export default function home() {
  const st = openState();
  const b = BUSINESS;
  const tz = tabrizNow(), ro = romeNow();
  const group = ["friends", "party"].map((id) => SPACES.find((s) => s.id === id));

  const html = `
    <section class="hero" aria-label="Basil">
      <div class="hero-paper" aria-hidden="true">
        ${["pizza", "pasta", "leaf", "lasagna", "sandwich", "drink", "slice", "dessert", "leaf"].map((d, i) => `<span class="hp hp${i + 1}">${doodle(d, { stroke: 2 })}</span>`).join("")}
      </div>
      <div class="hero-in">
        <p class="hero-kicker"><span class="flag" aria-hidden="true"><i></i><i></i><i></i></span>Italian restaurant · Tabriz</p>
        <div class="hero-brand">
          <h1 class="hero-word">Basil<span class="sr"> — باسیل</span></h1>
          <span class="hero-mark" aria-hidden="true">${mark({ snap: true, label: "" })}</span>
        </div>
        <p class="hero-fa">${faHTML(b.lineFa)}</p>
        <p class="hero-sub">On Italy time. Pizza from a hot oven and pasta in a kraft bowl, every day from one till midnight on Valiasr.</p>

        <div class="clocks" aria-label="The time in Tabriz and in Rome">
          <span class="clk"><small>Tabriz</small><b id="clk-tbz">${hhmm(tz)}</b></span>
          <span class="clk clk--it"><small><span class="flag" aria-hidden="true"><i></i><i></i><i></i></span>Roma</small><b id="clk-rome">${hhmm(ro)}</b></span>
          <span class="clk clk--state"><i class="dot${st.open ? " on" : ""}"></i><span id="clk-state">${esc(st.open ? "Open" : "Closed")}</span><small id="clk-sub">${st.open ? "till 24:00" : "from 13:00"}</small></span>
        </div>

        <div class="hero-cta">
          <a class="btn btn-primary" href="#/menu">${icon("pizza")}<span>Order now</span></a>
          <a class="btn btn-light" href="#/reserve">${icon("calendar")}<span>Book a table</span></a>
        </div>
      </div>
      <div class="hero-pics" aria-hidden="true">
        <span class="pic-card p1">${photoHTML("pizza-ham-sq", { sizes: "200px", eager: true, lazy: false })}</span>
        <span class="pic-card p2">${photoHTML("pepperoni-sq", { sizes: "200px", lazy: false })}</span>
        <span class="pic-card p3">${photoHTML("focaccia-sq", { sizes: "150px", lazy: false })}</span>
        <span class="pic-sticker">${mark({ tone: "disc", label: "" })}</span>
      </div>
    </section>

    <div class="wrap">
      <nav class="highlights reveal" aria-label="The menu, by section">
        ${CATEGORIES.map((c) => `<a class="hl" href="#/menu?c=${c.id}"><span class="hl-ring"><span class="hl-disc">${doodle(c.art, { stroke: 2.3 })}</span></span><span class="hl-t">${esc(c.short || c.name)}</span></a>`).join("")}
      </nav>

      <section class="sec reveal">
        <div class="sec-head"><h2>Out of the oven</h2><a class="more" href="#/menu">Full menu</a></div>
        <div class="rail">${SIGNATURES.map((id) => dish(byId(id))).join("")}</div>
      </section>

      <section class="sec">
        <a class="kiosk reveal" href="#/menu">
          <span class="kiosk-pic">${photoHTML("kiosk", { sizes: "(min-width: 760px) 340px, 46vw", pos: "50% 40%", alt: "Guests ordering at Basil's kiosk" })}</span>
          <span class="kiosk-t">
            <span class="kiosk-ico">${doodle("kiosk", { stroke: 2.4 })}</span>
            <b>Skip the kiosk queue</b>
            <span>The same order, from your phone: to your table or to take away. We call your number at the counter.</span>
            <span class="kiosk-go">Start an order ${icon("chevron")}</span>
          </span>
        </a>
      </section>

      <section class="sec">${clubCard()}</section>

      <section class="sec">
        <div class="sec-head reveal"><h2>Better with friends</h2><a class="more" href="#/reserve">Book</a></div>
        <div class="tray reveal" data-item="tray" tabindex="0" role="button" aria-label="Tray for Friends — open it">
          ${photoHTML("tray", { sizes: "(min-width: 760px) 680px, 92vw", pos: "50% 55%", alt: "A tray of square pizza" })}
          <span class="tray-scrim" aria-hidden="true"></span>
          <span class="tray-t"><small>Al taglio</small><b>A tray for the table — twelve squares, feeds four to six</b>
            <span class="tray-p">${priceHTML(byId("tray").price)}</span></span>
        </div>
        <div class="rooms">
          ${group.map((s) => `<a class="room reveal" href="#/reserve?space=${s.id}">
            <span class="room-ico">${doodle(s.icon, { stroke: 2.4 })}</span>
            <span class="room-t"><b>${esc(s.name)}</b>${faHTML(s.fa, " room-fa")}<small>${esc(s.note)}</small></span>
            <span class="room-go">${icon("chevron")}</span>
          </a>`).join("")}
        </div>
      </section>

      <section class="words reveal">
        <div class="words-mark">${mark({ snap: true, label: "" })}</div>
        <p class="words-fa">${faHTML(b.lineFa)}</p>
        <p class="words-en">“${esc(b.line)}”</p>
        <ul class="pillars">${b.pillars.map((p) => `<li><span class="pillar-ico">${doodle(p.icon, { stroke: 2.4 })}</span><b>${esc(p.en)}</b>${faHTML(p.fa)}</li>`).join("")}</ul>
      </section>

      <section class="sec reveal">
        <div class="sec-head"><h2>Find us</h2></div>
        <a class="findus" href="${b.maps}" target="_blank" rel="noopener" aria-label="Basil on the map — Valiasr, Roudaki, Tabriz">
          ${mapSVG()}
          <span class="findus-go">${icon("pin")}<span>Open in Maps</span></span>
        </a>
        <div class="list">
          <a class="row" href="${b.maps}" target="_blank" rel="noopener">
            <span class="row-ico row-ico--gold">${icon("pin")}</span>
            <span class="row-body"><span class="row-title">${esc(b.street)}, ${esc(b.city)}</span>
              <span class="row-sub">${faHTML(b.addressFa)}</span></span>
            <span class="row-chev">${icon("external")}</span>
          </a>
          <div class="row">
            <span class="row-ico row-ico--gold">${icon("clock")}</span>
            <span class="row-body"><span class="row-title">Every day, 13:00 – 24:00</span>
              <span class="row-sub"><i class="dot${st.open ? " on" : ""}"></i> ${esc(st.text)}</span></span>
          </div>
          <a class="row" href="${b.dm}" target="_blank" rel="noopener">
            <span class="row-ico row-ico--gold">${icon("instagram")}</span>
            <span class="row-body"><span class="row-title">Message @${esc(b.instagram)}</span><span class="row-sub">Bookings, big orders and questions, in DM</span></span>
            <span class="row-chev">${icon("external")}</span>
          </a>
        </div>
      </section>

      <section class="sec reveal">
        <div class="sec-head"><h2>On Instagram</h2><a class="more" href="https://instagram.com/${b.instagram}" target="_blank" rel="noopener">@${esc(b.instagram)}</a></div>
        <div class="gram">${GRAM.map((k) => `<a class="gram-cell" href="https://instagram.com/${b.instagram}" target="_blank" rel="noopener" aria-label="Basil on Instagram">${photoHTML(k, { sizes: "(min-width: 760px) 226px, 31vw" })}</a>`).join("")}</div>
        <p class="gram-n"><b>22.1K</b> people follow Basil · 200+ posts</p>
      </section>

      ${footer()}
    </div>`;

  return {
    html,
    title: "Basil",
    tone: "light",
    flush: true,
    mount(screen, onCleanup) {
      wireImages(screen);
      onCleanup(revealOn(screen));
      // the two clocks keep time while the screen is up
      const tick = () => {
        const now = new Date();
        const s = openState(now);
        const a = screen.querySelector("#clk-tbz"), r = screen.querySelector("#clk-rome");
        if (a) a.textContent = hhmm(tabrizNow(now));
        if (r) r.textContent = hhmm(romeNow(now));
        const stt = screen.querySelector("#clk-state");
        if (stt) {
          stt.textContent = s.open ? "Open" : "Closed";
          screen.querySelector("#clk-sub").textContent = s.open ? "till 24:00" : "from 13:00";
          screen.querySelector(".clk--state .dot").classList.toggle("on", s.open);
        }
      };
      const t = setInterval(tick, 15000);
      onCleanup(() => clearInterval(t));
      // the mark snaps again now and then — the gesture, not a loading spinner
      const mk = screen.querySelector(".hero-mark");
      if (mk && !reduced()) {
        const s = setInterval(() => {
          if (document.hidden) return;
          mk.classList.remove("snapping");
          void mk.offsetWidth;
          mk.classList.add("snapping");
        }, 6500);
        onCleanup(() => clearInterval(s));
      }
    },
  };
}
