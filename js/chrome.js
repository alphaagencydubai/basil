// The glass chrome: the bar at the top, the tab bar at the bottom, and the one
// scroll listener both of them answer to.
//
// THE TAB BAR is iOS 26's minimising tab bar. Four tabs — Home, Menu, Bag,
// Profile — on a floating capsule of glass, and Search as its own round glass
// button beside them, the way iOS sets search apart from an app's places. A
// lens springs between the tabs and follows a dragged finger. Read down a long
// page and the capsule shrinks to the tab you are on and slides to the leading
// edge while Search slides to the trailing one; scroll back up, or tap the
// capsule, and both return.
//
// THE TOP BAR keeps apart two things: the MATERIAL (glass and a hairline) and
// the COMPACT TITLE. On a plain page the material arrives as soon as anything
// scrolls beneath the bar and the title once the page's own title has gone by.
// Over a photograph the bar has no material and white controls; past it, glass,
// dark controls and the title together. The two states never overlap — the
// overlap is white type on white glass.
//
// Every position is computed here and handed to CSS as a custom property, and
// no stylesheet rule competes for them. Traps that have bitten this family of
// apps, all load-bearing here:
//
//  1. backdrop-filter samples nothing if any ANCESTOR is transformed. #tabbar
//     is a plain full-width row that never moves; only the capsule and the
//     Search button move, each by its own transform.
//  2. The lens lives INSIDE the positioned row, so a tab and the lens share one
//     coordinate space; measured from the capsule it sits off by the padding.
//  3. A folded bar must not measure the thing it folds: the tabs keep their
//     width and the capsule clips them.
//  4. Setting location.hash to the hash you already have fires no hashchange,
//     so the tab you are on scrolls to the top instead of navigating.
//  5. The first placement is instant, or a deep link watches the lens fly in.
//  6. A mouse dragged across a link starts the browser's own drag, which
//     cancels the pointer; the bar refuses dragstart and a cancel puts it back.

import { mark } from "./brand.js";
import { icon } from "./icons.js";
import { haptic, replay } from "./motion.js";
import { back, go } from "./router.js";
import * as store from "./store.js";
import { $, $$, clamp } from "./util.js";

const TAB_FOR = {
  "/": "home",
  "/menu": "menu",
  "/bag": "bag", "/order": "bag",
  "/profile": "profile", "/stamps": "profile", "/reserve": "profile", "/reservation": "profile", "/staff": "profile",
};

const PAD = 6;        // capsule padding, each side
const GAP = 10;       // capsule to the Search button, when open
const EDGE = 16;      // a folded bar's inset from the edge of the screen
const STAGE = 560;    // on a wide screen, fold to the edges of this column, not the window

let bar, caps, row, tabs, acc, topbar, tbTitle, tbLead, tbTrail;
let active = null, minimized = false, ready = false;
let baseTone = "light", pushed = false, backTo = "#/";

/* ---------------------------------------------------------------- geometry */
function slot(tab) {
  const r = tab.getBoundingClientRect();
  return { left: r.left - row.getBoundingClientRect().left, width: r.width };
}

function layout({ instant = false } = {}) {
  if (!tabs?.length) return;
  const vw = document.documentElement.clientWidth;
  const cur = tabs.find((tab) => tab.dataset.tab === active) || null;
  const openW = tabs.reduce((s, tab) => s + tab.getBoundingClientRect().width, 0) + PAD * 2;
  const accW = acc.offsetWidth;
  const here = cur ? slot(cur) : null;

  let capW, capX, accX, rowX = 0;
  if (minimized && here) {
    const stage = Math.min(vw, STAGE);
    const left = (vw - stage) / 2;
    capW = here.width + PAD * 2;
    capX = left + EDGE;
    accX = left + stage - EDGE - accW;
    rowX = -here.left;
  } else {
    const group = openW + (accW ? GAP + accW : 0);
    capW = openW;
    capX = (vw - group) / 2;
    accX = capX + openW + GAP;
  }

  if (instant || !ready) bar.classList.add("instant");
  const px = (n) => `${Math.round(n)}px`;
  const set = (name, value) => bar.style.setProperty(name, value);
  set("--cap-w", px(capW));
  set("--cap-x", px(capX));
  set("--acc-x", px(accX));
  set("--row-x", px(rowX));
  if (here) {
    set("--lens-x", px(here.left));
    set("--lens-w", px(here.width));
    bar.classList.remove("no-lens");
  } else {
    bar.classList.add("no-lens");
  }
  if (!ready) {
    ready = true;
    bar.dataset.ready = "1";
  }
  if (bar.classList.contains("instant")) {
    requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.remove("instant")));
  }
}

export function paintTabs(path) {
  const root = "/" + (String(path || "/").split("/")[1] || "");
  active = TAB_FOR[root] ?? null;
  tabs.forEach((tab) => tab.setAttribute("aria-current", tab.dataset.tab === active ? "page" : "false"));
  layout({ instant: bar.classList.contains("no-lens") });
}

/* ---------------------------------------------------------- fold on scroll */
function setMin(on) {
  if (on === minimized) return;
  // never fold a page too short to have been scrolled on purpose
  if (on && (!active || document.documentElement.scrollHeight - innerHeight < 620)) return;
  minimized = on;
  bar.classList.toggle("min", on);
  layout();
}
export const expandBar = () => setMin(false);

/* ----------------------------------------------------------------- top bar */
let mediaEnd = 0, titleEnd = 0;

function flag(name, on) {
  const v = on ? "1" : "0";
  if (topbar.dataset[name] !== v) topbar.dataset[name] = v;
}

function paintTop(y) {
  const barH = topbar.offsetHeight;
  if (mediaEnd > 0) {
    const over = y < mediaEnd - barH;
    const tone = over ? "dark" : "light";
    if (topbar.dataset.tone !== tone) topbar.dataset.tone = tone;
    flag("lifted", !over);
    flag("titled", !over && y > titleEnd);
  } else {
    if (topbar.dataset.tone !== "light") topbar.dataset.tone = "light";
    const scrollable = document.documentElement.scrollHeight - innerHeight > 40;
    flag("lifted", scrollable && y > 4);
    flag("titled", y > titleEnd);
  }
  // while the tab bar floats over the photograph it takes dark glass, so its
  // labels stay legible; over the page it is the theme's own material
  const over = mediaEnd > 0 && mediaEnd - y > bar.getBoundingClientRect().top + 8 ? "dark" : "";
  if ((bar.dataset.over || "") !== over) bar.dataset.over = over;
}

/** Where this screen's photograph and its title end, in document coordinates. */
function remeasure(screen = document.querySelector("#view .screen")) {
  if (!screen) return;
  const y = scrollY;
  const media = baseTone === "dark" ? screen.querySelector(".hero, .photo-head") : null;
  mediaEnd = media ? media.getBoundingClientRect().bottom + y : 0;
  const h1 = screen.querySelector("h1");
  titleEnd = h1 ? Math.max(8, h1.getBoundingClientRect().bottom + y - topbar.offsetHeight) : 8;
}

function paintLead() {
  tbLead.innerHTML = pushed
    ? `<button class="tb-btn" type="button" data-back aria-label="Back">${icon("back")}</button>`
    : `<a class="tb-mark" href="#/" aria-label="Basil — home">${mark({ label: "" })}</a>`;
}

function paintTrail() {
  if (!tbTrail) return;
  const m = store.me();
  const html = store.isMember()
    ? `<a class="tb-pts" href="#/profile" aria-label="${m.points} Basil Club leaves">${icon("basil")}<span>${m.points.toLocaleString("en-US")}</span></a>`
    : `<a class="tb-pts tb-pts--join" href="#/profile" aria-label="Join Basil Club">${icon("basil")}<span>Join</span></a>`;
  if (tbTrail.innerHTML !== html) tbTrail.innerHTML = html;
}

/** Called after every render. */
export function measureScreen(screen, { title = "", tone = "light", back: b = false } = {}) {
  baseTone = tone === "dark" ? "dark" : "light";
  pushed = Boolean(b);
  backTo = typeof b === "string" ? b : "#/";
  tbTitle.textContent = title;
  topbar.dataset.pushed = pushed ? "1" : "0";
  paintLead();
  remeasure(screen);
  lastY = Math.max(0, scrollY);
  run = 0;
  if (minimized) {
    minimized = false;
    bar.classList.remove("min");
  }
  paintTop(lastY);
  layout();
  // photographs and fonts can still move the page's title: measure again once they settle
  requestAnimationFrame(() => { remeasure(screen); paintTop(Math.max(0, scrollY)); });
  document.fonts?.ready?.then(() => { remeasure(screen); paintTop(Math.max(0, scrollY)); });
}

/* ------------------------------------------------------ the single scroll */
let lastY = 0, run = 0, ticking = false;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const y = Math.max(0, scrollY);
    const max = document.documentElement.scrollHeight - innerHeight;
    const dy = y - lastY;
    lastY = y;
    paintTop(y);
    if (y < 120) { run = 0; setMin(false); return; }
    // the rubber band at the foot of a page reads as a scroll back up — ignore it
    if (y >= max - 2 && dy < 0) return;
    run = Math.sign(dy) === Math.sign(run) ? run + dy : dy;
    if (run > 52) setMin(true);
    else if (run < -30) setMin(false);
  });
}

/* ------------------------------------------------------------ drag the lens */
let drag = null, swallow = false;

function nearestTab(x) {
  let best = 0, gap = Infinity;
  tabs.forEach((tab, i) => {
    const s = slot(tab);
    const d = Math.abs(s.left + s.width / 2 - x);
    if (d < gap) { gap = d; best = i; }
  });
  return best;
}

const currentHash = () => location.hash.split("?")[0] || "#/";

function bindDrag() {
  bar.addEventListener("dragstart", (e) => e.preventDefault());

  caps.addEventListener("pointerdown", (e) => {
    if (minimized || e.button > 0) return;
    drag = { x0: e.clientX, id: e.pointerId, moved: false, idx: -1 };
  });

  caps.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved) {
      if (Math.abs(e.clientX - drag.x0) < 8) return;
      drag.moved = true;
      try { caps.setPointerCapture(e.pointerId); } catch {}
      bar.classList.add("dragging");
      bar.classList.remove("no-lens");
    }
    const box = row.getBoundingClientRect();
    const x = clamp(e.clientX - box.left, 0, box.width);
    const idx = nearestTab(x);
    const w = slot(tabs[idx]).width;
    bar.style.setProperty("--lens-w", `${Math.round(w)}px`);
    bar.style.setProperty("--lens-x", `${Math.round(clamp(x - w / 2, 0, box.width - w))}px`);
    if (idx !== drag.idx) {
      drag.idx = idx;
      haptic(4);
      tabs.forEach((tab, i) => tab.classList.toggle("under", i === idx));
    }
  });

  const finish = () => {
    const d = drag;
    drag = null;
    bar.classList.remove("dragging");
    tabs.forEach((tab) => tab.classList.remove("under"));
    return d;
  };

  caps.addEventListener("pointerup", () => {
    const d = finish();
    if (!d || !d.moved) return;
    swallow = true;
    setTimeout(() => { swallow = false; }, 0);
    const href = tabs[d.idx]?.getAttribute("href");
    if (href && href !== currentHash()) go(href);
    else layout();
  });
  caps.addEventListener("pointercancel", () => { finish(); layout(); });

  caps.addEventListener("click", (e) => {
    if (swallow) { e.preventDefault(); e.stopPropagation(); return; }
    const tab = e.target.closest(".tab");
    // a folded bar shows only the tab you are on: a tap opens it and goes back to the top
    if (minimized) {
      e.preventDefault();
      setMin(false);
      if (tab) scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!tab) return;
    haptic(5);
    // trap 4: the tab you are on returns to the top, as on iOS
    if (tab.getAttribute("href") === currentHash()) {
      e.preventDefault();
      scrollTo({ top: 0, behavior: "smooth" });
    }
  }, true);

  acc.addEventListener("click", (e) => {
    e.preventDefault();
    haptic(6);
    if (minimized) setMin(false);
    if (currentHash() === "#/menu") {
      scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => document.getElementById("q")?.focus({ preventScroll: true }), 260);
      return;
    }
    go("#/menu?search=1");
  });
}

/* ------------------------------------------------------------------- badge */
function paintBadge() {
  const tab = tabs.find((x) => x.dataset.tab === "bag");
  const badge = tab?.querySelector(".tab-badge");
  if (!badge) return;
  const n = store.bagCount();
  const text = n ? String(n > 99 ? "99+" : n) : "";
  const changed = badge.textContent !== text;
  badge.textContent = text;
  badge.classList.toggle("on", n > 0);
  if (changed && n > 0) replay(badge, "bump");
  tab.setAttribute("aria-label", n ? `Bag, ${n} ${n === 1 ? "item" : "items"}` : "Bag");
}

/* ------------------------------------------------------------------- setup */
export function initChrome() {
  topbar = $("#topbar");
  tbTitle = $("#tb-title");
  tbLead = $("#tb-lead");
  tbTrail = $("#tb-trail");
  bar = $("#tabbar");
  caps = $("#tabs");
  row = $("#tabs-row");
  tabs = $$(".tab", row);
  acc = $("#search-btn");

  tabs.forEach((tab) => {
    const key = tab.dataset.tab;
    tab.querySelector(".tab-ico").innerHTML = icon(key) + icon(key + "F")
      + (key === "bag" ? '<span class="tab-badge" aria-hidden="true"></span>' : "");
  });
  acc.innerHTML = icon("search");

  paintLead();
  paintTrail();
  paintBadge();
  bindDrag();
  store.subscribe(() => { paintBadge(); paintTrail(); });

  topbar.addEventListener("click", (e) => {
    if (!e.target.closest("[data-back]")) return;
    haptic(5);
    back(backTo);
  });

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => {
    remeasure();
    paintTop(Math.max(0, scrollY));
    layout({ instant: true });
  });
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(() => layout());
    tabs.forEach((tab) => ro.observe(tab));
  }
  document.fonts?.ready?.then(() => layout());
  layout({ instant: true });
}
