// Hash routing.
//
// Every render builds a fresh screen node and hands it to the view's mount(),
// so listeners die with the node — nothing stacks on a second visit. go() to
// the hash you already have fires no hashchange, so it delegates to refresh(),
// which re-renders in place and keeps the scroll position.
//
// Scroll is restored only on a real Back. popstate fires on a plain forward
// `location.hash = …` exactly as it does on Back, so it cannot be the signal:
// every entry is stamped with an index, and a Back is landing on a lower one.

import { $ } from "./util.js";

const routes = [];
let current = null;

export const route = (pattern, view) => routes.push({ pattern, view });

const match = (hash) => {
  const path = (hash.replace(/^#/, "") || "/").split("?")[0] || "/";
  for (const r of routes) {
    if (r.pattern === path) return { view: r.view, params: {}, path };
    if (r.pattern.includes(":")) {
      const p = r.pattern.split("/"), q = path.split("/");
      if (p.length !== q.length) continue;
      const params = {};
      const ok = p.every((seg, i) =>
        seg.startsWith(":") ? (params[seg.slice(1)] = decodeURIComponent(q[i])) : seg === q[i]);
      if (ok) return { view: r.view, params, path };
    }
  }
  return null;
};

export const query = () =>
  Object.fromEntries(new URLSearchParams(location.hash.split("?")[1] || ""));

/* ------------------------------------------------------ entries and Back */
let navIndex = 0;
let backing = false;

function stampEntry() {
  const st = history.state;
  if (st && typeof st.cc === "number") { navIndex = st.cc; return; }
  navIndex += 1;
  try { history.replaceState({ ...(st || {}), cc: navIndex }, ""); } catch {}
}
addEventListener("popstate", (e) => {
  const i = e.state && typeof e.state.cc === "number" ? e.state.cc : null;
  backing = i !== null && i < navIndex;
});

/* ----------------------------------------------------------------- render */
const scrollMemory = new Map();
const cleanups = [];
let rendering = false, again = false;

export async function render({ keepScroll = false } = {}) {
  // a navigation that lands mid-render is not dropped: it renders straight after
  if (rendering) { again = true; return; }
  rendering = true;
  const isBack = backing;
  backing = false;
  try {
    const host = $("#view");
    const hit = match(location.hash) || match("#/");
    const y = keepScroll ? scrollY : 0;
    if (current && !keepScroll) {
      document.dispatchEvent(new CustomEvent("view:leaving", { detail: { path: current } }));
      scrollMemory.set(current, scrollY);
    }
    const prev = current;
    current = hit.path;
    const out = await hit.view(hit.params, query());
    const screen = document.createElement("div");
    screen.className = "screen" + (out.flush ? " flush" : " pad-top");
    screen.dataset.route = hit.path.split("/")[1] || "home";
    screen.innerHTML = typeof out === "string" ? out : out.html;
    if (keepScroll) screen.style.animation = "none";
    // the screen going away lets go of what it held outside itself first
    cleanups.splice(0).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    host.replaceChildren(screen);
    if (typeof out === "object" && out.mount) out.mount(screen, (fn) => cleanups.push(fn));
    const restore = isBack && prev !== current ? scrollMemory.get(current) : null;
    scrollTo({ top: keepScroll ? y : (restore || 0), behavior: "instant" });
    stampEntry();
    document.dispatchEvent(new CustomEvent("view:rendered", {
      detail: {
        path: current, screen,
        title: out.title || "", tone: out.tone || "light", back: Boolean(out.back),
      },
    }));
  } catch (e) {
    console.error(e);
  } finally {
    rendering = false;
    if (again) { again = false; render(); }
  }
}

/** Re-render the current screen in place, keeping the scroll position. */
export const refresh = () => render({ keepScroll: true });

export function startRouter() {
  addEventListener("hashchange", () => render());
  if (!location.hash) history.replaceState(history.state, "", "#/");
  return render();
}

export function go(hash) {
  const target = hash.startsWith("#") ? hash : "#" + hash;
  if (location.hash === target) return refresh();
  location.hash = target;
}
/** Back if there is somewhere to go back to inside the app, else home. */
export const back = (fallback = "#/") => (navIndex > 1 ? history.back() : go(fallback));
export const path = () => current;
