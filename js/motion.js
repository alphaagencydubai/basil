// Motion helpers. Everything here steps aside for reduced motion.

export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A tap you can feel, where the phone allows it (Android; iOS ignores it). */
export function haptic(pattern = 8) {
  try { navigator.vibrate?.(pattern); } catch {}
}

/** Restart a CSS animation that is keyed to a class. */
export function replay(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/**
 * Reveal elements as they arrive. Returns a stop() so a screen can let go of
 * the observer when it is replaced.
 */
export function revealOn(root) {
  const items = [...root.querySelectorAll(".reveal")];
  if (!items.length) return () => {};
  if (reduced() || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return () => {};
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const i = Number(e.target.dataset.revealDelay || 0);
      setTimeout(() => e.target.classList.add("in"), Math.min(i, 5) * 60);
      io.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.04 });
  items.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/**
 * A dish thrown at the bag: a small round copy of its picture arcs from where
 * it was tapped to the Bag tab and shrinks into it. Appended to <body>, which is
 * never transformed, and moves by its own transform only — so it can pass over
 * the glass bar without turning anything into a backdrop root.
 */
export function fly(from, to, { src = "" } = {}) {
  if (!from || !to || reduced()) return Promise.resolve();
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  if (!a.width || !b.width) return Promise.resolve();
  const size = 46;
  const dot = document.createElement("div");
  dot.className = "fly";
  dot.setAttribute("aria-hidden", "true");
  if (src) dot.style.backgroundImage = `url("${src}")`;
  dot.style.left = `${a.left + a.width / 2 - size / 2}px`;
  dot.style.top = `${a.top + a.height / 2 - size / 2}px`;
  document.body.append(dot);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const lift = Math.min(160, Math.abs(dy) * 0.35 + 50);
  const anim = dot.animate([
    { transform: "translate(0, 0) scale(1)", opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(.82)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(.28)`, opacity: 0.2 },
  ], { duration: 620, easing: "cubic-bezier(.4, 0, .2, 1)" });
  return anim.finished.catch(() => {}).then(() => dot.remove());
}
