// Shared pieces every view borrows: photographs, the toast, the − n + control,
// the one-tap add, the sheet and the item sheet, segmented controls, the footer.
//
// Every fragment returns a string and every mount takes a node, so a screen is
// one template literal and one listener rather than a component tree.

import { BUSINESS } from "./config.js";
import { OPTION_GROUPS, artOf, byId } from "./data.js";
import { doodle } from "./doodles.js";
import { mark } from "./brand.js";
import { icon } from "./icons.js";
import { fly, haptic, reduced, replay } from "./motion.js";
import { PHOTOS } from "./photos.js";
import { addLine, defaults, removeLine, unitPrice } from "./store.js";
import { $, $$, esc, money, priceHTML, priceText } from "./util.js";

/* ---------------------------------------------------------------- Persian */
/** A Persian gloss. Set in IRANYekanX FaNum, so any digit in it comes out Persian by itself. */
export const faHTML = (text, cls = "") => `<span class="fa${cls}" lang="fa" dir="rtl">${esc(text)}</span>`;

/* ----------------------------------------------------------------- photos */
/**
 * One of their photographs, at the size the slot needs. The small file is in
 * the srcset beside the large one, so a thumbnail never downloads a hero; the
 * width attribute is the file's real width, so nothing is drawn past it; the
 * average tone paints the frame until the pixels arrive.
 */
export function photoHTML(key, { sizes = "(min-width: 900px) 480px, 92vw", pos = "", alt = "", eager = false, lazy = true, cls = "" } = {}) {
  const p = PHOTOS[key];
  if (!p) return "";
  // a horizontal rail passes lazy:false — Chrome measures lazy distance sideways
  // too, and the last card would arrive only once swiped to
  const load = eager ? 'fetchpriority="high"' : lazy ? 'loading="lazy"' : "";
  const set = p.sw < p.w
    ? `assets/photos/${key}-sm.webp ${p.sw}w, assets/photos/${key}.webp ${p.w}w`
    : `assets/photos/${key}.webp ${p.w}w`;
  return `<img class="pic${cls ? " " + cls : ""}" src="assets/photos/${key}-sm.webp" srcset="${set}" sizes="${sizes}"`
    + ` width="${p.w}" height="${p.h}" alt="${esc(alt)}" ${load} decoding="async" draggable="false"`
    + ` style="--tone:${p.tone}${pos ? `;object-position:${pos}` : ""}">`;
}

/** A dish's square: its own photograph, or its doodle on their aqua — the way their highlights look. */
export function thumbHTML(item, px = 60) {
  if (item.thumb) return photoHTML(item.thumb, { sizes: `${px}px`, alt: "" });
  return artHTML(item);
}
export const artHTML = (item, cls = "") =>
  `<span class="art${cls ? " " + cls : ""}" data-art="${artOf(item)}">${doodle(artOf(item), { stroke: 2.2 })}</span>`;

/** An image that fails retries once, then keeps its tone. It is never removed. */
export function wireImages(root = document) {
  $$("img.pic", root).forEach((im) => {
    if (im.dataset.wired) return;
    im.dataset.wired = "1";
    im.addEventListener("error", () => {
      if (im.dataset.retry) return;
      im.dataset.retry = "1";
      setTimeout(() => { im.removeAttribute("srcset"); im.src = im.src.split("?")[0] + "?r=1"; }, 900);
    });
  });
}

/* ------------------------------------------------------------------ toast */
let toastTimer = null;
const hideToast = () => $("#toast")?.classList.remove("on");

/** A glass capsule under the top bar — iOS's way of saying a small thing is done. */
export function toast(message, { action = null, ms = 2600, ico = "check" } = {}) {
  const el = $("#toast");
  if (!el) return;
  el.innerHTML = `<span class="toast-ico">${icon(ico)}</span><span class="toast-t"></span>`
    + (action ? `<a class="toast-act" href="${action.href || "#"}">${esc(action.label)}</a>` : "");
  el.querySelector(".toast-t").textContent = message;
  const act = el.querySelector(".toast-act");
  act?.addEventListener("click", (e) => {
    if (action.run) { e.preventDefault(); action.run(); }
    hideToast();
  });
  el.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, ms);
}

/* -------------------------------------------------------------------- qty */
export const qtyHTML = (n, label = "") => `
  <span class="qty" role="group" ${label ? `aria-label="${esc(label)}"` : ""}>
    <button type="button" data-dec aria-label="One fewer">${icon("minus")}</button>
    <output aria-live="polite">${n}</output>
    <button type="button" data-inc aria-label="One more">${icon("plus")}</button>
  </span>`;

/** Wire a − n + control. onChange gets the new quantity. */
export function qty(node, { value, min = 0, max = 20, onChange }) {
  const out = node.querySelector("output");
  const set = (n) => {
    value = Math.min(max, Math.max(min, n));
    out.textContent = value;
    onChange(value);
  };
  node.querySelector("[data-dec]").addEventListener("click", (e) => { e.stopPropagation(); haptic(6); set(value - 1); });
  node.querySelector("[data-inc]").addEventListener("click", (e) => { e.stopPropagation(); haptic(6); set(value + 1); });
  return { set: (n) => { value = n; out.textContent = n; } };
}

/* ------------------------------------------------------------- add to bag */
export const addHTML = (item) => `
  <button class="add" type="button" data-add="${item.id}" aria-label="Add ${esc(item.name)} to your bag">
    <span class="add-plus">${icon("plus")}</span><span class="add-check">${icon("check")}</span>
  </button>`;

/** Where a thing thrown at the bag lands: the Bag tab, or the folded capsule. */
function bagTarget() {
  const bar = $("#tabbar");
  if (bar?.classList.contains("min")) return $("#tabs");
  return $('#tabbar .tab[data-tab="bag"] .tab-ico');
}

/** One tap: it goes in as it comes, flies to the bag, the button ticks. */
export function addItem(id, btn, { qty: n = 1, opts = null, from = null } = {}) {
  const item = byId(id);
  if (!item) return;
  haptic([8, 30, 10]);
  addLine(id, n, opts);
  if (btn) { replay(btn, "done"); setTimeout(() => btn.classList.remove("done"), 1100); }
  const img = from || btn?.closest("[data-item]")?.querySelector("img.pic, .art");
  const src = img?.tagName === "IMG" ? (img.currentSrc || img.src) : "";
  fly(img || btn, bagTarget(), { src }).then(() => replay($('#tabbar .tab[data-tab="bag"]'), "bump"));
  toast(n > 1 ? `${n} × ${item.name} added` : `${item.name} added`, { action: { label: "View bag", href: "#/bag" } });
}

/** One listener for the whole app, on the document: views come and go, it stays single. */
export function wireAdds() {
  if (wireAdds.done) return;
  wireAdds.done = true;
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (btn) { e.preventDefault(); e.stopPropagation(); addItem(btn.dataset.add, btn); return; }
    const open = e.target.closest("[data-item]");
    if (open && !e.target.closest("a[href], button, input, label, select, textarea")) {
      e.preventDefault();
      itemSheet(open.dataset.item);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const open = e.target.closest?.("[data-item]");
    if (open && e.target === open) { e.preventDefault(); itemSheet(open.dataset.item); }
  });
}

/* ------------------------------------------------------------------ sheet */
let openNow = null;

export function closeSheet() {
  if (!openNow) return;
  const { scrim, sheet, onClose, onKey, focus } = openNow;
  openNow = null;
  sheet.classList.remove("on");
  scrim.classList.remove("on");
  document.documentElement.classList.remove("sheet-open");
  document.removeEventListener("keydown", onKey);
  const done = () => { scrim.remove(); sheet.remove(); onClose?.(); };
  reduced() ? done() : setTimeout(done, 420);
  try { focus?.focus({ preventScroll: true }); } catch {}
}

/**
 * A bottom sheet with a grabber — swipe it down, tap outside or press Escape to
 * close. On a wide screen it is a centred card. body/foot are HTML; mount(sheet)
 * runs once it is in the document.
 */
export function openSheet({ title = "", sub = "", body = "", foot = "", mount, onClose, label = "", cls = "" } = {}) {
  closeSheet();
  const root = $("#sheet-root");
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  const sheet = document.createElement("section");
  sheet.className = "sheet" + (cls ? " " + cls : "");
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", label || title || "Details");
  sheet.tabIndex = -1;
  sheet.innerHTML = `
    <div class="sheet-grab"><i></i></div>
    <button class="sheet-close" type="button" aria-label="Close">${icon("close")}</button>
    <div class="sheet-body">
      ${title ? `<h2 class="sheet-title">${title}</h2>` : ""}
      ${sub ? `<p class="sheet-sub">${sub}</p>` : ""}
      ${body}
    </div>
    ${foot ? `<div class="sheet-foot">${foot}</div>` : ""}`;
  root.append(scrim, sheet);
  const onKey = (e) => { if (e.key === "Escape") closeSheet(); };
  document.addEventListener("keydown", onKey);
  openNow = { scrim, sheet, onClose, onKey, focus: document.activeElement };
  requestAnimationFrame(() => requestAnimationFrame(() => {
    scrim.classList.add("on");
    sheet.classList.add("on");
    document.documentElement.classList.add("sheet-open");
    sheet.focus({ preventScroll: true });
  }));

  scrim.addEventListener("click", closeSheet);
  sheet.querySelector(".sheet-close").addEventListener("click", closeSheet);

  // drag down on the grabber, or on the body when it is scrolled to its top
  let y0 = null, dy = 0, t0 = 0;
  const grab = sheet.querySelector(".sheet-grab");
  const bodyEl = sheet.querySelector(".sheet-body");
  const start = (e) => { y0 = e.touches[0].clientY; dy = 0; t0 = performance.now(); sheet.classList.add("drag"); };
  const move = (e) => {
    if (y0 == null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    sheet.style.setProperty("--drag", `${dy}px`);
  };
  const end = () => {
    if (y0 == null) return;
    const v = dy / Math.max(1, performance.now() - t0);
    sheet.classList.remove("drag");
    sheet.style.removeProperty("--drag");
    if (dy > 110 || (dy > 40 && v > 0.6)) closeSheet();
    y0 = null;
  };
  grab.addEventListener("touchstart", start, { passive: true });
  grab.addEventListener("touchmove", move, { passive: true });
  grab.addEventListener("touchend", end);
  bodyEl.addEventListener("touchstart", (e) => { if (bodyEl.scrollTop <= 0) start(e); }, { passive: true });
  bodyEl.addEventListener("touchmove", (e) => { if (y0 != null && bodyEl.scrollTop <= 0) move(e); }, { passive: true });
  bodyEl.addEventListener("touchend", end);

  mount?.(sheet);
  wireImages(sheet);
  return { sheet, close: closeSheet };
}

/** Yes / no, iOS-style. */
export function confirmSheet({ title, sub = "", yes = "OK", no = "Cancel", danger = false, onYes }) {
  openSheet({
    title: esc(title), sub: esc(sub), label: title, cls: "sheet--confirm",
    foot: `<div class="btn-pair"><button class="btn btn-ghost" type="button" data-no>${esc(no)}</button>`
      + `<button class="btn ${danger ? "btn-danger" : "btn-primary"}" type="button" data-yes>${esc(yes)}</button></div>`,
    mount(sheet) {
      sheet.querySelector("[data-no]").addEventListener("click", closeSheet);
      sheet.querySelector("[data-yes]").addEventListener("click", () => { closeSheet(); onYes?.(); });
    },
  });
}

/* ------------------------------------------------------------- item sheet */
/** A dish or a drink: its photograph, what it is, the choices it takes. line = edit that bag line. */
export function itemSheet(id, { line = null } = {}) {
  const item = byId(id);
  if (!item) return;
  const editing = Boolean(line);
  const opts = { ...defaults(item), ...(line?.opts || {}) };
  let n = line ? line.qty : 1;
  const hero = item.photo
    ? `<div class="it-hero">${photoHTML(item.photo, { sizes: "(min-width: 700px) 560px, 100vw", pos: item.pos, eager: true, alt: item.name })}</div>`
    : `<div class="it-hero it-hero--art">${artHTML(item, "art--hero")}</div>`;
  const groups = (item.options || []).map((g) => {
    const grp = OPTION_GROUPS[g];
    return `<fieldset class="opt" data-g="${g}"><legend class="opt-name">${esc(grp.name)}</legend><div class="opt-row">`
      + grp.choices.map((c) => `<button type="button" class="pill" data-v="${c.id}" aria-pressed="${opts[g] === c.id}">${esc(c.label)}${c.add ? `<small>+${money(c.add)}</small>` : ""}</button>`).join("")
      + `</div></fieldset>`;
  }).join("");
  const body = `${hero}
    <div class="it-head">
      <div class="it-titles">
        ${item.tag ? `<span class="tag${item.hot ? " tag--hot" : ""}">${esc(item.tag)}</span>` : ""}
        <h2 class="it-name">${esc(item.name)}</h2>
        ${faHTML(item.fa, " it-fa")}
      </div>
      <div class="it-price" id="it-unit"></div>
    </div>
    <p class="it-desc">${esc(item.desc)}</p>
    ${groups}`;
  const foot = `<div class="it-foot">${qtyHTML(n, "Quantity")}`
    + `<button class="btn btn-primary btn-grow" type="button" id="it-go"><span>${editing ? "Update" : "Add to bag"}</span><span class="btn-sum" id="it-sum"></span></button></div>`;
  openSheet({
    body, foot, label: item.name, cls: "sheet--item" + (item.photo ? "" : " sheet--art"),
    mount(sheet) {
      const sum = sheet.querySelector("#it-sum"), unit = sheet.querySelector("#it-unit");
      const paint = () => {
        const u = unitPrice(item, opts);
        unit.innerHTML = priceHTML(u);
        sum.textContent = priceText(u * n);
      };
      sheet.querySelectorAll(".opt").forEach((fs) => fs.addEventListener("click", (e) => {
        const b = e.target.closest(".pill");
        if (!b) return;
        haptic(6);
        opts[fs.dataset.g] = b.dataset.v;
        fs.querySelectorAll(".pill").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        paint();
      }));
      qty(sheet.querySelector(".qty"), { value: n, min: 1, max: 20, onChange: (v) => { n = v; paint(); } });
      paint();
      sheet.querySelector("#it-go").addEventListener("click", () => {
        if (editing) {
          removeLine(line.key);
          addLine(item.id, n, opts);
          closeSheet();
          toast(`${item.name} updated`);
          return;
        }
        const img = sheet.querySelector(".it-hero img, .it-hero .art");
        addItem(item.id, null, { qty: n, opts, from: img });
        closeSheet();
      });
    },
  });
}

/* ------------------------------------------------------ segmented control */
export const segHTML = (name, options, value, cls = "") => `
  <div class="seg ${cls}" role="radiogroup" aria-label="${esc(name)}" data-seg="${esc(name)}">
    <span class="seg-ink" aria-hidden="true"></span>
    ${options.map((o) => `<button type="button" role="radio" aria-checked="${o.v === value}" data-v="${o.v}">${o.ico ? icon(o.ico) : ""}<span>${esc(o.label)}</span></button>`).join("")}
  </div>`;

/** The pill slides to the chosen segment; onChange(value). */
export function wireSeg(seg, onChange) {
  const ink = seg.querySelector(".seg-ink");
  const place = (animate = true) => {
    const on = seg.querySelector('[aria-checked="true"]') || seg.querySelector("button");
    if (!on || !on.offsetWidth) return;
    if (!animate) ink.style.transition = "none";
    ink.style.width = `${on.offsetWidth}px`;
    ink.style.transform = `translateX(${on.offsetLeft}px)`;
    if (!animate) { void ink.offsetWidth; ink.style.transition = ""; }
    seg.dataset.ready = "1";
  };
  seg.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-v]");
    if (!b || b.getAttribute("aria-checked") === "true") return;
    seg.querySelectorAll("button[data-v]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    haptic(6);
    place();
    onChange(b.dataset.v, e);
  });
  place(false);
  if ("ResizeObserver" in window) new ResizeObserver(() => place(false)).observe(seg);
  return { place };
}

/* ------------------------------------------------------------ small parts */
export const emptyHTML = ({ ico = "bag", title, sub, cta = "", href = "#/" }) => `
  <div class="empty">
    <span class="empty-ico">${icon(ico)}</span>
    <p class="empty-t">${esc(title)}</p>
    <p class="empty-s">${esc(sub)}</p>
    ${cta ? `<a class="btn btn-primary" href="${href}">${esc(cta)}</a>` : ""}
  </div>`;

export const tierChip = (tier) => `<span class="tier tier--${tier.id}">${esc(tier.name)}</span>`;

/** Where the preview is honest about itself. */
export const noteHTML = (text, ico = "info") => `<p class="note">${icon(ico)}<span>${esc(text)}</span></p>`;

/** Alpha's sign, the way codeconceptcafe.com carries it: their wordmark, then the credit. */
export const poweredHTML = () => `
  <a class="powered" href="https://alphaa.agency" target="_blank" rel="noopener" aria-label="Powered by Alpha Agency">
    <img class="on-light" src="assets/brand/alpha-black.png" alt="" width="34" height="26" loading="lazy">
    <img class="on-dark" src="assets/brand/alpha-white.png" alt="" width="34" height="26" loading="lazy">
    <span><small>Powered by</small><b>Alpha Agency</b></span>
  </a>`;

export function footer() {
  const b = BUSINESS;
  return `<footer class="foot">
    <div class="foot-top">
      <div class="foot-disc">${mark({ tone: "disc", label: "Basil" })}</div>
      <div>
        <div class="foot-word" aria-hidden="true">BASIL</div>
        <div class="foot-fa">${faHTML(b.faFull)}</div>
      </div>
    </div>
    <p class="foot-line">${faHTML(b.lineFa)}</p>
    <div class="foot-lines">
      <div>${esc(b.street)}, ${esc(b.city)} · ${faHTML(b.addressFa)}</div>
      <div>Every day, 13:00 – 24:00 · <a href="https://instagram.com/${b.instagram}" target="_blank" rel="noopener">@${esc(b.instagram)}</a></div>
    </div>
    ${poweredHTML()}
    <p class="foot-note">Preview. The menu, the prices and Basil Club stand in until Basil sets their own. Nothing here reaches Basil — orders, leaves and bookings stay on this phone.</p>
  </footer>`;
}
