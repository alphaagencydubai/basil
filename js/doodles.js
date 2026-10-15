// Basil's doodles — drawn the way their Instagram highlights are drawn: one
// rounded monoline, no fills, a little leaf where it fits, and the three
// "snap" strokes from their mark when something is fresh out of the oven.
//
// 48 × 48, round caps and joins. doodle() draws them big (category circles,
// menu tiles, the stamp card); icon() in icons.js borrows them at 24 px for
// rows and buttons, at a stroke that matches the system set.

const P = (d, extra = "") => `<path d="${d}"${extra ? " " + extra : ""}/>`;
const C = (cx, cy, r, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}"${extra ? " " + extra : ""}/>`;

// Shapes that get placed at a size are transformed point by point rather than
// with an SVG transform, so their strokes stay the weight of everything else.
const fmt = (v) => (Math.round(v * 100) / 100).toString();
function place(segs, x, y, s, rot) {
  const r = rot * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
  const t = (px, py) => `${fmt(x + (px * cos - py * sin) * s)} ${fmt(y + (px * sin + py * cos) * s)}`;
  return segs.map(([cmd, ...pts]) => {
    const out = [];
    for (let i = 0; i < pts.length; i += 2) out.push(t(pts[i], pts[i + 1]));
    return cmd + out.join(" ");
  }).join("");
}

// the basil leaf from their mark, small: a teardrop with its vein
const LEAF_OUT = [["M", 0, 6], ["C", -3.2, 4.4, -4, 1, -2.6, -2.2], ["C", -1.4, -4.8, 1, -6.2, 3.2, -6.4],
  ["C", 4.2, -3.8, 4.3, -0.8, 2.8, 1.8], ["C", 2, 3.4, 1, 4.6, 0, 6], ["Z"]];
const LEAF_VEIN = [["M", 0, 6], ["C", 0.4, 3, 1.2, 0.4, 2.6, -2.2]];
const LEAF = (x, y, s = 1, rot = 0) => P(place(LEAF_OUT, x, y, s, rot)) + P(place(LEAF_VEIN, x, y, s, rot));

// the three snap strokes, as in their mark, fanned around a point
const SNAP_SEGS = [["M", -5.6, 1.4], ["L", -9, -0.4], ["M", -2.6, -2.4], ["L", -4.6, -5.8], ["M", 1.6, -3.4], ["L", 1.2, -7.4]];
const SNAP = (x, y, s = 1, rot = 0) => P(place(SNAP_SEGS, x, y, s, rot));

const WAVE = (x0, x1, y, amp = 1.5, step = 5) => {
  let d = `M${x0} ${y}`;
  let up = true;
  for (let x = x0; x < x1; x += step) {
    const nx = Math.min(x1, x + step);
    d += `Q${x + step / 2} ${y + (up ? -amp : amp)} ${nx} ${y}`;
    up = !up;
  }
  return P(d);
};

export const DOODLES = {
  // a slice, tip down, crust up — their PIZZA highlight
  pizza: P("M8.6 13.4c10-6.4 20.8-6.4 30.8 0l-2.7 4.8L24.6 41.6a.7.7 0 0 1-1.2 0L11.3 18.2Z")
       + P("M11.3 18.2c8.4-4.8 17-4.8 25.4 0")
       + C(19.6, 24, 2.6) + C(28.4, 23.4, 2.2) + C(24.2, 31.6, 2.1)
       + P("M14.4 24.6c0 2.2-.1 3.4-1.2 4") + SNAP(40, 9, .9, 18),

  // a square of the tray, with its bubbles
  slice: P("M9 15.2a3 3 0 0 1 3.4-2.5l23.4 3.4a3 3 0 0 1 2.5 3.4l-2.6 18a3 3 0 0 1-3.4 2.5L9 36.6a3 3 0 0 1-2.5-3.4Z")
       + P("M11.4 17.6l22.6 3.3")
       + C(17, 26, 2.2) + C(27.6, 28.4, 2.6) + C(20.4, 33, 1.6) + C(31.2, 34.6, 1.2)
       + LEAF(23.6, 24, .9, 30),

  // a bowl of pasta with a leaf on top — their PASTA highlight
  pasta: P("M6.4 24.6h35.2c0 8.2-7.9 14-17.6 14S6.4 32.8 6.4 24.6Z") + P("M17 41.6h14")
       + P("M10.6 24.4c.8-4.6 5.4-7.6 13.4-7.6s12.6 3 13.4 7.6")
       + P("M14.4 22.6c1.8-1.6 3.4.6 5.2-1s3.4.6 5.2-1 3.4.6 5.2-1 3 .4 4.2-.6")
       + LEAF(25.6, 11.4, 1, 24),

  // a block of lasagna, its layers, a leaf, and the snap — their LASAGNA highlight
  lasagna: P("M6.6 21.4h26v17.2h-26z") + P("M6.6 21.4l8.6-6.6h26l-8.6 6.6") + P("M32.6 38.6l8.6-6.6V14.8")
         + WAVE(6.6, 32.6, 27.2, 1.4, 4.33) + WAVE(6.6, 32.6, 33, 1.4, 4.33)
         + LEAF(24, 11.6, .85, 20) + SNAP(37.6, 8.6, .8, 10),

  // a focaccia sandwich: dimpled top, a wave of leaves, the base
  sandwich: P("M7.4 21.4c0-6.6 7.4-11 16.6-11s16.6 4.4 16.6 11Z")
          + P("M16.6 15.4h.01M23 13.8h.01M29.6 15.4h.01M20 18.2h.01M27 18.2h.01", 'stroke-width="3"')
          + WAVE(6.4, 41.6, 25, 1.8, 5)
          + P("M8.6 29.2h30.8")
          + P("M8 33h32v2.6a3.6 3.6 0 0 1-3.6 3.6H11.6A3.6 3.6 0 0 1 8 35.6Z"),

  // a salad bowl
  salad: P("M6.4 24.6h35.2c0 8.2-7.9 14-17.6 14S6.4 32.8 6.4 24.6Z") + P("M17 41.6h14")
       + LEAF(15.6, 18, 1.15, -40) + LEAF(32, 17.4, 1.15, 40) + C(24, 19, 3.6) + P("M24 15.4v-1.8"),

  // a tall glass of their lemonade, a straw, a leaf on the rim
  drink: P("M13.2 11.6h21.6l-2.6 27.6a3 3 0 0 1-3 2.7h-10.4a3 3 0 0 1-3-2.7Z") + P("M14.2 20.4h19.6")
       + P("M26.6 20.4 30.4 5.6l4.4 1.2") + C(20.6, 28.4, 1.4) + C(25.6, 33.4, 1.1) + C(21.6, 36, .8)
       + LEAF(11.4, 9.6, 1, -34),

  // an espresso cup
  coffee: P("M9.6 20.6h22.8v6.6a11.4 11.4 0 0 1-22.8 0Z") + P("M32.4 22.6h2.6a4.2 4.2 0 0 1 0 8.4h-3.4")
        + P("M6.6 41.2h30") + P("M16.4 7.4c-1.6 1.6-1.6 3.2 0 4.8M21.8 5.6c-1.6 1.6-1.6 3.2 0 4.8M27.2 7.4c-1.6 1.6-1.6 3.2 0 4.8"),

  // tiramisu in its cup, a spoon in
  dessert: P("M11.4 16.6h25.2l-2.2 21.8a3 3 0 0 1-3 2.7H16.6a3 3 0 0 1-3-2.7Z")
         + P("M12.4 24.6h23.2") + WAVE(13.2, 34.8, 31.4, 1.3, 4.32)
         + P("M18 20.6h.01M24 20.2h.01M30 20.6h.01", 'stroke-width="3"')
         + P("M31.4 15.4l6-10") + P("M36.2 4.6c1.4-1.2 3.4-.4 3.2 1.4"),

  // two friends at the long green table — their FRIENDS highlight
  friends: C(16.4, 15, 4.2) + C(31.6, 15, 4.2)
         + P("M8.8 31.4c0-5.6 3.4-9.4 7.6-9.4s7.6 3.8 7.6 9.4") + P("M24 31.4c0-5.6 3.4-9.4 7.6-9.4s7.6 3.8 7.6 9.4")
         + P("M5.4 31.4h37.2") + P("M10.4 31.4v10M37.6 31.4v10")
         + P("M24 6.2V3.4M18.6 6.8l-1.2-2.4M29.4 6.8l1.2-2.4"),

  // a pizza party: an open box, a balloon
  party: P("M5.6 30.4h24.8v8.4H5.6z") + P("M5.6 30.4 10 17.2h24.6l-4.2 13.2")
       + C(14.2, 34.6, .1, 'stroke-width="3"') + C(21.6, 34.6, .1, 'stroke-width="3"')
       + P("M37.2 5.2c3.8 0 6.4 3.2 6.4 7.2 0 4.6-3.4 7.8-6.4 7.8s-6.4-3.2-6.4-7.8c0-4 2.6-7.2 6.4-7.2Z")
       + P("M37.2 20.2c-1.4 2.6 1.4 4.4 0 7s1.4 4.6 0 7.2 1.2 4 0 6"),

  // their self-order kiosk, their leaf on its screen
  kiosk: P("M14.6 4.6h18.8a2.2 2.2 0 0 1 2.2 2.2v24.4a2.2 2.2 0 0 1-2.2 2.2H14.6a2.2 2.2 0 0 1-2.2-2.2V6.8a2.2 2.2 0 0 1 2.2-2.2Z")
       + P("M16.6 8.6h14.8v15.6H16.6z") + P("M21.4 33.4 19.4 43h9.2l-2-9.6") + P("M16.2 43h15.6")
       + LEAF(24, 16.4, .95, 18) + P("M21.4 28.6h5.2"),

  // the oven's mouth
  oven: P("M6.4 35.6c0-10.4 7.9-18.8 17.6-18.8s17.6 8.4 17.6 18.8") + P("M3.6 35.6h40.8") + P("M3.6 41.2h40.8")
      + P("M16 35.6c0-4.6 3.6-8.2 8-8.2s8 3.6 8 8.2")
      + P("M22 34.4c-1-2 .8-3.4 2-5.6 1.2 2.2 3 3.6 2 5.6") + P("M30.4 18.6V9.4h4.6v12.2"),

  // the leaf alone, as a stamp or a point
  leaf: LEAF(24, 24, 3.2, 20),

  // the clock their bio is about
  clock: C(24, 24, 16) + P("M24 14v10l6.4 4") + SNAP(38, 9, .9, 20),

  // a map pin with a leaf
  pin: P("M24 42.4c7.6-8.6 11.6-14.8 11.6-19.6a11.6 11.6 0 0 0-23.2 0c0 4.8 4 11 11.6 19.6Z") + LEAF(24, 22.6, .95, 18),
};

/** doodle("pizza") → an <svg> string, stroked in currentColor. */
export function doodle(name, { cls = "", stroke = 2.4, label = "" } = {}) {
  const body = DOODLES[name];
  if (!body) return "";
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="doodle${cls ? " " + cls : ""}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="${stroke}" `
    + `stroke-linecap="round" stroke-linejoin="round" ${a11y} focusable="false">${body}</svg>`;
}

export const hasDoodle = (name) => Boolean(DOODLES[name]);
