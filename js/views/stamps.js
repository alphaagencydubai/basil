// The pizza stamp card. A stamp for every pizza an order carries once it has
// been served — a tray counts as one, slices do not — and the eighth turns
// itself into a pizza on the house, waiting in the wallet. The card is Alpha's
// proposal; the numbers are in config.js.

import { CLUB } from "../config.js";
import { mark } from "../brand.js";
import { doodle } from "../doodles.js";
import { icon } from "../icons.js";
import { jLabel } from "../jalali.js";
import { revealOn } from "../motion.js";
import * as store from "../store.js";
import { noteHTML } from "../ui.js";
import { esc, gDate, plural } from "../util.js";
import { stampsHTML } from "./home.js";

export default function stamps() {
  const member = store.isMember();
  const m = store.me();
  const n = member ? m.stamps : 0;
  const left = CLUB.stampsPerCard - n;
  const withPizza = member
    ? store.orders().filter((o) => o.member === m.id && o.status === "served" && store.pizzasIn(o) > 0).slice(0, 6)
    : [];
  const free = member ? store.liveVouchers().filter((v) => v.source === "stamps") : [];

  const html = `
    <div class="wrap">
      <header class="ph"><h1 class="lt">Stamp card</h1>
        <p class="ph-sub">A stamp for every pizza. The eighth is on Basil.</p></header>

      <section class="sec">
        <div class="scard">
          <span class="scard-disc" aria-hidden="true">${mark({ tone: "disc", label: "" })}</span>
          <div class="scard-top"><span class="scard-k">Basil Club</span><span class="scard-n"><b>${n}</b>/${CLUB.stampsPerCard}</span></div>
          ${stampsHTML(n, { big: true })}
          <p class="scard-sub">${member
            ? (left === 1 ? "One more pizza — the next one is ours." : `${left} more pizzas to a pizza on us.`)
            : "Join Basil Club and every pizza you order here stamps itself."}</p>
          ${member ? "" : `<a class="btn btn-gold block" href="#/profile?join=1">${icon("basil")}<span>Join with your mobile</span></a>`}
        </div>
      </section>

      ${free.length ? `<section class="sec reveal">
        <div class="sec-head"><h2>Waiting for you</h2></div>
        <div class="list">${free.map((v) => `<div class="row">
          <span class="row-ico row-ico--gold">${icon("pizza")}</span>
          <span class="row-body"><span class="row-title">${esc(v.label)}</span><span class="row-sub">From a full card · use by ${esc(jLabel(v.expires))}</span></span>
          <a class="btn btn-gold sm" href="#/menu?c=pizza">Choose</a>
        </div>`).join("")}</div>
      </section>` : ""}

      <section class="sec reveal">
        <div class="sec-head"><h2>How it works</h2></div>
        <ol class="how">
          <li><span class="how-ico">${doodle("pizza", { stroke: 2.4 })}</span><b>Order a pizza</b><span>Here, at the kiosk or at the counter — show your card or give your number.</span></li>
          <li><span class="how-ico">${doodle("oven", { stroke: 2.4 })}</span><b>It's served, it's stamped</b><span>The stamp lands when the pizza does, not before. A tray counts as one.</span></li>
          <li><span class="how-ico">${doodle("leaf", { stroke: 2.4 })}</span><b>The eighth is ours</b><span>A full card drops a pizza on the house in your wallet, for sixty days.</span></li>
        </ol>
      </section>

      ${withPizza.length ? `<section class="sec reveal">
        <div class="sec-head"><h2>Stamped</h2>${member && m.cards ? `<span class="sub">${plural(m.cards, "card")} filled</span>` : ""}</div>
        <div class="list">${withPizza.map((o) => {
          const pz = store.pizzasIn(o);
          return `<a class="row" href="#/order/${o.id}">
            <span class="row-ico row-ico--gold">${icon("pizza")}</span>
            <span class="row-body"><span class="row-title">Order ${esc(o.code)}</span><span class="row-sub">${gDate(o.at)} · ${esc(o.lines.filter((l) => store.pizzasIn({ lines: [l] })).map((l) => l.name).join(", "))}</span></span>
            <span class="row-val">+${pz} ${pz === 1 ? "stamp" : "stamps"}</span>
          </a>`;
        }).join("")}</div>
      </section>` : ""}

      ${noteHTML("The stamp card is part of Basil Club, Alpha's proposal. Basil sets the real rules — how many stamps, and which pizzas count.")}
    </div>`;

  return {
    html,
    title: "Stamp card",
    back: "#/profile",
    mount(screen, onCleanup) { onCleanup(revealOn(screen)); },
  };
}
