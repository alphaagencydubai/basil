// The opening: their avatar full screen — the hand on the aqua — and the snap,
// the three strokes springing out of the fingertips, then BASIL and their line.
// Once per session: a reload in the same session gets the hand, still, and a
// quick fade, because a logo that performs on every tap becomes a spinner.
//
// index.html carries the markup inline (build.py writes it from js/brand.js),
// so the mark is on screen with the first paint, not after the module graph.

import { STORAGE } from "./config.js";

const SEEN = STORAGE + "booted";
const root = document.documentElement;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const loaded = (img) => (!img || (img.complete && img.naturalWidth))
  ? Promise.resolve()
  : new Promise((r) => {
    img.addEventListener("load", r, { once: true });
    img.addEventListener("error", r, { once: true });
  });

export async function runBoot(firstRender) {
  const boot = document.getElementById("boot");
  if (!boot) { root.classList.remove("booting"); return; }
  const warm = root.classList.contains("boot-warm");
  try { sessionStorage.setItem(SEEN, "1"); } catch {}

  const ready = (async () => {
    await Promise.resolve(firstRender).catch(() => {});
    await Promise.all([
      loaded(document.querySelector(".pic-card img")),
      document.fonts?.ready?.catch?.(() => {}),
    ]);
  })();
  // long enough to read the mark on a first visit, barely there on a reload
  await Promise.race([Promise.all([ready, wait(warm ? 160 : 1500)]), wait(3000)]);

  boot.classList.add("gone");
  await wait(460);
  boot.remove();
  root.classList.remove("booting", "boot-warm");
  document.dispatchEvent(new CustomEvent("boot:done"));
}
