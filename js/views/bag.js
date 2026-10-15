// The bag. Change a line's choices or its count, take it out (with an undo),
// say where it goes — your table or the counter — use a Basil Club voucher, and
// place it. Nothing is paid in the app: you pay at the counter, as you would.

import { byId } from "../data.js";
import { icon } from "../icons.js";
import { haptic } from "../motion.js";
import { go, refresh } from "../router.js";
import * as store from "../store.js";
import { emptyHTML, faHTML, itemSheet, qty, qtyHTML, segHTML, thumbHTML, toast, wireImages, wireSeg } from "../ui.js";
import { $, esc, money, plural, priceHTML, priceText, sum } from "../util.js";

// what was typed survives a re-render (a line changed in a sheet repaints the bag)
const draft = { mode: "table", table: "", note: "", name: null, voucher: null };
const sigOf = () => store.bag().map((l) => l.key).join(",");

const summaryOf = (o) => {
  const names = o.lines.map((l) => (l.qty > 1 ? `${l.qty} × ${l.name}` : l.name));
  return names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "");
};

const lineHTML = (l) => {
  const it = byId(l.id);
  const lab = store.optsLabel(it, l.opts);
  return `
    <li class="line" data-key="${esc(l.key)}">
      <span class="line-img">${thumbHTML(it, 58)}</span>
      <span class="line-t">
        <span class="line-n">${esc(it.name)}</span>
        ${faHTML(it.fa, " line-fa")}
        ${it.options?.length ? `<button class="line-o" type="button" data-edit>${esc(lab || "As it comes")}<span>Change</span></button>` : ""}
      </span>
      <span class="line-r"><span class="line-p">${money(store.lineTotal(l))}</span>${qtyHTML(l.qty, `${it.name}, how many`)}</span>
    </li>`;
};

function voucherRows(lines) {
  const vs = store.liveVouchers();
  if (!vs.length) {
    return `<p class="small muted">No vouchers yet. Fill your <a class="link" href="#/stamps">pizza stamp card</a> or spend leaves in your profile.</p>`;
  }
  return `<div class="list">${vs.map((v) => {
    const eff = store.voucherEffect(v, lines);
    const on = draft.voucher === v.id;
    return `<button class="row vrow" type="button" data-v="${v.id}" aria-pressed="${on}"${eff.amount ? "" : ' data-dead="1"'}>
      <span class="row-ico">${icon(v.source === "stamps" ? "pizza" : "ticket")}</span>
      <span class="row-body"><span class="row-title">${esc(v.label)}</span>
        <span class="row-sub">${esc(eff.amount ? `−${money(eff.amount)} T on this order` : eff.why)}</span></span>
      <span class="check" aria-hidden="true">${icon("check")}</span>
    </button>`;
  }).join("")}</div>`;
}

function emptyBag() {
  const last = store.orders()[0];
  return {
    title: "Bag",
    html: `
      <div class="wrap">
        <header class="ph"><h1 class="lt">Bag</h1></header>
        ${emptyHTML({ ico: "bag", title: "Your bag is empty", sub: "Everything on the menu goes in with one tap.", cta: "See the menu", href: "#/menu" })}
        ${last ? `
        <section class="sec">
          <div class="sec-head"><h2>Last time</h2></div>
          <div class="list"><button class="row" type="button" id="again">
            <span class="row-ico">${icon("refresh")}</span>
            <span class="row-body"><span class="row-title">${esc(summaryOf(last))}</span><span class="row-sub">${priceText(last.total)} · the same again</span></span>
            <span class="row-chev">${icon("plus")}</span>
          </button></div>
        </section>` : ""}
      </div>`,
    mount(screen) {
      screen.querySelector("#again")?.addEventListener("click", () => {
        const n = store.reorder(last.id);
        haptic([8, 30, 10]);
        toast(`${plural(n, "item")} back in your bag`);
        refresh();
      });
    },
  };
}

export default function bagView() {
  const lines = store.bag();
  if (!lines.length) return emptyBag();
  if (draft.name == null) draft.name = store.isMember() ? store.me().name : "";
  if (draft.voucher && !store.liveVouchers().some((v) => v.id === draft.voucher)) draft.voucher = null;
  const member = store.isMember();

  const html = `
    <div class="wrap">
      <header class="ph"><h1 class="lt">Bag</h1><p class="ph-sub" id="bag-sub"></p></header>
      <ul class="lines card" id="lines">${lines.map(lineHTML).join("")}</ul>

      <section class="sec">
        <div class="sec-head"><h2>Where should it go?</h2></div>
        ${segHTML("Where", [{ v: "table", label: "To my table", ico: "dinein" }, { v: "takeaway", label: "Takeaway", ico: "takeaway" }], draft.mode, "seg--wide")}
        <div class="fields">
          <label class="field" id="table-field"${draft.mode === "table" ? "" : " hidden"}><span class="field-l">Table number</span>
            <input id="table" inputmode="numeric" maxlength="3" placeholder="Optional — we'll find you" value="${esc(draft.table)}" autocomplete="off"></label>
          <label class="field"><span class="field-l">Name for the order</span>
            <input id="oname" maxlength="40" placeholder="Optional" value="${esc(draft.name)}" autocomplete="name"></label>
          <label class="field"><span class="field-l">Anything the kitchen should know?</span>
            <textarea id="note" maxlength="200" rows="2" placeholder="Allergies, no onion, extra crispy…">${esc(draft.note)}</textarea></label>
        </div>
      </section>

      <section class="sec">
        <div class="sec-head"><h2>Basil Club</h2>${member ? `<span class="sub">${store.me().points.toLocaleString("en-US")} leaves · ${store.me().stamps}/8 stamps</span>` : ""}</div>
        ${member
          ? `<div id="vouchers">${voucherRows(lines)}</div>`
          : `<a class="row join-row card" href="#/profile?join=1">
              <span class="row-ico row-ico--gold">${icon("basil")}</span>
              <span class="row-body"><span class="row-title">Join Basil Club</span><span class="row-sub" id="join-sub"></span></span>
              <span class="row-chev">${icon("chevron")}</span>
            </a>`}
      </section>

      <section class="sec">
        <div class="card card-pad receipt">
          <div class="receipt-row"><span class="k">Subtotal</span><span class="v" id="s-sub"></span></div>
          <div class="receipt-row credit" id="s-disc-row" hidden><span class="k" id="s-disc-k"></span><span class="v" id="s-disc"></span></div>
          <div class="receipt-row total"><span class="k">To pay at the counter</span><span class="v" id="s-total"></span></div>
          <p class="receipt-pts" id="s-pts"></p>
        </div>
        <p class="pay-note">Nothing is paid in the app — you pay at the counter when it's ready.</p>
      </section>
    </div>`;

  return {
    html,
    title: "Bag",
    mount(screen, onCleanup) {
      const q = (s) => screen.querySelector(s);
      const dock = $("#dock");
      dock.innerHTML = `<div class="dock-sum"><small id="d-count"></small><b id="d-total"></b></div>
        <button class="btn btn-primary" type="button" id="place">${icon("check")}<span>Place order</span></button>`;
      dock.hidden = false;
      dock.dataset.for = "bag";
      onCleanup(() => { dock.hidden = true; dock.innerHTML = ""; delete dock.dataset.for; });

      let sig = sigOf();
      let placing = false;

      const paint = () => {
        const now = store.bag();
        if (draft.voucher && !store.voucherById(draft.voucher)) draft.voucher = null;
        const t = store.totals(now, draft.voucher);
        const pz = store.pizzasIn({ lines: now });
        const n = sum(now, (l) => l.qty);
        q("#bag-sub").textContent = `${plural(n, "item")} · ready in about 12 minutes`;
        q("#s-sub").innerHTML = priceHTML(t.subtotal);
        q("#s-disc-row").hidden = !t.discount;
        if (t.discount) {
          q("#s-disc-k").textContent = t.voucher.label;
          q("#s-disc").textContent = `−${money(t.discount)}`;
        }
        q("#s-total").innerHTML = priceHTML(t.total);
        q("#s-pts").innerHTML = member
          ? `${icon("basil")}<span>Earns <b>${t.points.toLocaleString("en-US")}</b> leaves${pz ? ` and <b>${pz}</b> pizza ${pz === 1 ? "stamp" : "stamps"}` : ""} once it's served</span>`
          : `${icon("basil")}<span>A member would earn <b>${store.pointsFor(t.total, 0)}</b> leaves${pz ? ` and <b>${pz}</b> pizza ${pz === 1 ? "stamp" : "stamps"}` : ""} on this order</span>`;
        const js = q("#join-sub");
        if (js) js.textContent = `This order would earn ${store.pointsFor(t.total, 0)} leaves — and there's a welcome 100`;
        $("#d-count").textContent = plural(n, "item");
        $("#d-total").innerHTML = priceHTML(t.total);
        const vl = q("#vouchers");
        if (vl) vl.innerHTML = voucherRows(now);
      };

      const drop = (li, key) => {
        sig = store.bag().filter((x) => x.key !== key).map((x) => x.key).join(",");
        const gone = store.removeLine(key);
        haptic(10);
        li.classList.add("leaving");
        setTimeout(() => {
          if (!store.bag().length) refresh();
          else { li.remove(); paint(); }
        }, 280);
        if (gone) {
          toast(`${byId(gone.line.id).name} taken out`, { ico: "trash", action: { label: "Undo", run: () => store.restoreLine(gone) } });
        }
      };

      screen.querySelectorAll(".line").forEach((li) => {
        const key = li.dataset.key;
        const start = store.bag().find((x) => x.key === key);
        qty(li.querySelector(".qty"), {
          value: start.qty, min: 0, max: 20,
          onChange: (v) => {
            if (v === 0) { drop(li, key); return; }
            store.setQty(key, v);
            const l = store.bag().find((x) => x.key === key);
            if (l) li.querySelector(".line-p").textContent = money(store.lineTotal(l));
            paint();
          },
        });
        li.querySelector("[data-edit]")?.addEventListener("click", () => {
          const l = store.bag().find((x) => x.key === key);
          if (l) itemSheet(l.id, { line: l });
        });
      });

      // a line added elsewhere, changed in a sheet, or brought back by Undo repaints
      // the whole bag; a count going up or down is painted in place above
      onCleanup(store.subscribe(() => {
        if (placing) return;
        const next = sigOf();
        if (next !== sig) { sig = next; refresh(); }
      }));

      wireSeg(q(".seg"), (v) => { draft.mode = v; q("#table-field").hidden = v !== "table"; });
      q("#table").addEventListener("input", (e) => {
        draft.table = e.target.value.replace(/[^\d۰-۹]/g, "").slice(0, 3);
        e.target.value = draft.table;
      });
      q("#oname").addEventListener("input", (e) => { draft.name = e.target.value; });
      q("#note").addEventListener("input", (e) => { draft.note = e.target.value; });

      screen.addEventListener("click", (e) => {
        const v = e.target.closest("[data-v]");
        if (!v || !v.closest("#vouchers")) return;
        const voucher = store.voucherById(v.dataset.v);
        const eff = store.voucherEffect(voucher, store.bag());
        if (!eff.amount && draft.voucher !== voucher.id) { toast(eff.why, { ico: "info" }); return; }
        draft.voucher = draft.voucher === voucher.id ? null : voucher.id;
        haptic(6);
        paint();
      });

      $("#place").addEventListener("click", () => {
        placing = true;
        const o = store.placeOrder({ mode: draft.mode, table: draft.table, note: draft.note, name: draft.name || "", voucherId: draft.voucher });
        if (!o) { placing = false; return; }
        draft.note = "";
        draft.table = "";
        draft.voucher = null;
        haptic([12, 40, 18]);
        go(`#/order/${o.id}`);
      });

      paint();
      wireImages(screen);
    },
  };
}
