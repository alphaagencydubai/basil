// An order, placed. The number is what the counter calls; the ring counts down
// the preview oven's minutes and the steps move on their own. The leaves it
// earns land when it is served — not before — and the screen says which.
// Nothing is paid here: the total is what to hand over at the counter.

import { ORDER } from "../config.js";
import { icon } from "../icons.js";
import { go, refresh } from "../router.js";
import * as store from "../store.js";
import { emptyHTML, faHTML, toast } from "../ui.js";
import { clamp, esc, gDate, hm, minsLeft, money, plural, priceHTML, sum } from "../util.js";

const STEPS = ["Received", "In the oven", "Ready", "Served"];

export default function orderView({ id }) {
  const o = store.orderById(id);
  if (!o) {
    return {
      title: "Order", back: "#/bag",
      html: `<div class="wrap">${emptyHTML({ ico: "receipt", title: "No order here", sub: "It may have been cleared from this phone.", cta: "See the menu", href: "#/menu" })}</div>`,
    };
  }
  const count = sum(o.lines, (l) => l.qty);
  const where = o.mode === "table"
    ? (o.table ? `We'll bring it to table ${esc(o.table)}.` : "We'll bring it to your table.")
    : `We'll call number ${esc(o.code)} at the counter.`;
  const mine = o.member && store.isMember() && o.member === store.me().id;

  const pointsLine = () => {
    if (!o.member) return `<a class="row join-row card" href="#/profile?join=1"><span class="row-ico row-ico--gold">${icon("basil")}</span><span class="row-body"><span class="row-title">Join Basil Club</span><span class="row-sub">Orders like this one earn leaves — and every pizza a stamp</span></span><span class="row-chev">${icon("chevron")}</span></a>`;
    const fresh = store.orderById(o.id);
    const served = fresh?.status === "served";
    const pz = store.pizzasIn(o);
    const st = pz ? ` and <b>${pz}</b> pizza ${pz === 1 ? "stamp" : "stamps"}` : "";
    return `<p class="order-pts">${icon("basil")}<span>${served && fresh.credited
      ? `<b>${o.points.toLocaleString("en-US")}</b> leaves${st} added to your card`
      : `<b>${o.points.toLocaleString("en-US")}</b> leaves${st} land on your card when it's served`}</span></p>`;
  };

  const html = `
    <div class="wrap order">
      <section class="order-hero">
        <div class="order-ring">
          <svg viewBox="0 0 220 220" aria-hidden="true"><circle class="track" cx="110" cy="110" r="100"/><circle class="fill" id="ring-fill" cx="110" cy="110" r="100" pathLength="1000"/></svg>
          <div class="order-ring-in"><span class="eyebrow">Order</span><span class="order-code">${esc(o.code)}</span><span class="order-eta" id="eta"></span></div>
        </div>
        <h1 class="lt order-title" id="o-title">Received</h1>
        <p class="order-where">${where}${o.name ? ` Under ${esc(o.name)}.` : ""}</p>
      </section>

      <ol class="steps" id="steps">${STEPS.map((s, i) => `<li data-s="${i}"><i></i><span>${s}</span></li>`).join("")}</ol>

      <section class="sec">
        <div class="sec-head"><h2>${plural(count, "item")} · ${gDate(o.at)}, ${hm(o.at)}</h2></div>
        <div class="list">
          ${o.lines.map((l) => `<div class="row"><span class="qty-n">${l.qty}×</span>
            <span class="row-body"><span class="row-title">${esc(l.name)}</span>${l.fa ? faHTML(l.fa, " row-fa") : ""}${l.label ? `<span class="row-sub">${esc(l.label)}</span>` : ""}</span>
            <span class="row-val">${money(l.unit * l.qty)}</span></div>`).join("")}
          ${o.discount ? `<div class="row"><span class="row-body"><span class="row-title">${esc(o.voucher?.label || "Voucher")}</span></span><span class="row-val credit">−${money(o.discount)}</span></div>` : ""}
          <div class="row row--total"><span class="row-body"><span class="row-title">To pay at the counter</span></span><span class="row-val">${priceHTML(o.total)}</span></div>
        </div>
        ${o.note ? `<p class="order-note">“${esc(o.note)}”</p>` : ""}
      </section>

      <section class="sec" id="pts">${pointsLine()}</section>

      <div class="stack order-acts">
        <button class="btn btn-ghost block" type="button" data-again>${icon("refresh")}<span>Order the same again</span></button>
        <a class="btn btn-primary block" href="#/menu">Back to the menu</a>
      </div>
    </div>`;

  return {
    html,
    title: `Order ${o.code}`,
    back: mine ? "#/profile" : "#/menu",
    mount(screen, onCleanup) {
      const fill = screen.querySelector("#ring-fill");
      const eta = screen.querySelector("#eta");
      const title = screen.querySelector("#o-title");
      const steps = [...screen.querySelectorAll("#steps li")];
      const span = Math.max(1, o.ready - o.at);
      let settled = store.orderById(o.id)?.status === "served";

      const paint = () => {
        const now = Date.now();
        const stage = store.orderStage(store.orderById(o.id) || o, now);
        fill.style.strokeDashoffset = String(1000 - Math.round(clamp((now - o.at) / span, 0, 1) * 1000));
        eta.textContent = stage >= 2 ? (stage === 3 ? "Served" : "Ready") : `about ${minsLeft(o.ready, now)} min`;
        title.textContent = stage === 3 ? "Served — enjoy it" : stage === 2 ? (o.mode === "table" ? "On its way to you" : "Ready at the counter") : stage === 1 ? "In the oven" : "Received";
        steps.forEach((s, i) => {
          s.classList.toggle("done", i < stage || stage === 3);
          s.classList.toggle("now", i === stage && stage < 3);
        });
        // the moment it is served, the points land — settle and repaint once
        if (stage === 3 && !settled) {
          settled = true;
          if (store.reconcile(now)) screen.querySelector("#pts").innerHTML = pointsLine();
        }
      };
      paint();
      const t = setInterval(paint, 1000);
      onCleanup(() => clearInterval(t));

      screen.querySelector("[data-again]").addEventListener("click", () => {
        const n = store.reorder(o.id);
        toast(`${plural(n, "item")} back in your bag`, { action: { label: "View bag", href: "#/bag" } });
      });
    },
  };
}

// the kitchen's timings are the config's; exported for the e2e suite's arithmetic
export const TIMING = ORDER;
