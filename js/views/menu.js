// Menu. The chips filter to one section, or all of them; search matches the
// English and the Persian names and the descriptions across every section. The
// plus adds a dish as it comes in one tap; a tap anywhere else on the row opens
// it with its choices.

import { CATEGORIES, inCat } from "../data.js";
import { icon } from "../icons.js";
import { doodle } from "../doodles.js";
import { addHTML, artHTML, faHTML, noteHTML, photoHTML, wireImages } from "../ui.js";
import { esc, hash32, priceHTML } from "../util.js";

// an Arabic keyboard types ي and ك where Persian has ی and ک
const norm = (s) => String(s || "").toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").trim();

const row = (it) => `
  <li class="mrow has-img${it.thumb ? "" : " is-art"}"${it.thumb ? "" : ` style="--tilt:${(hash32(it.id) % 17) - 8}deg"`} data-item="${it.id}" tabindex="0" data-q="${esc(norm(`${it.name} ${it.desc} ${it.fa}`))}">
    <span class="mrow-t">
      <span class="mrow-n">${esc(it.name)}${it.tag ? ` <span class="tag${it.hot ? " tag--hot" : ""}">${esc(it.tag)}</span>` : ""}</span>
      ${faHTML(it.fa, " mrow-fa")}
      <span class="mrow-d">${esc(it.desc)}</span>
      <span class="mrow-p">${priceHTML(it.price)}</span>
    </span>
    <span class="mrow-img">${it.thumb ? photoHTML(it.thumb, { sizes: "96px", alt: "" }) : artHTML(it)}${addHTML(it)}</span>
  </li>`;

export default function menu(_, q) {
  let cat = CATEGORIES.some((c) => c.id === q.c) ? q.c : "all";

  const html = `
    <div class="wrap">
      <header class="ph">
        <h1 class="lt">Menu</h1>${faHTML("منو", " ph-fa")}
        <p class="ph-sub">Skip the kiosk queue: order here, to your table or to take away, and pay at the counter.</p>
      </header>
      <label class="search">${icon("search")}<input id="q" type="search" placeholder="Search dishes and drinks" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-label="Search the menu"><button class="search-x" id="q-x" type="button" aria-label="Clear the search" hidden>${icon("close")}</button></label>
    </div>
    <div class="chips-bar">
      <div class="chips" id="chips" role="toolbar" aria-label="Menu sections">
        ${[{ id: "all", name: "All" }, ...CATEGORIES].map((c) => `<button type="button" class="chip" data-c="${c.id}" aria-pressed="${c.id === cat}">${c.art ? icon(c.art) : ""}<span>${esc(c.short || c.name)}</span></button>`).join("")}
      </div>
    </div>
    <div class="wrap" id="menu-body">
      ${CATEGORIES.map((c) => `
        <section class="msec" data-c="${c.id}"${cat !== "all" && cat !== c.id ? " hidden" : ""}>
          <div class="msec-head"><span class="msec-art">${doodle(c.art, { stroke: 2.4 })}</span><span class="msec-t"><h2>${esc(c.name)}</h2>${c.sub ? `<small>${esc(c.sub)}</small>` : ""}</span>${faHTML(c.fa, " msec-fa")}</div>
          <ul class="mlist">${inCat(c.id).map(row).join("")}</ul>
        </section>`).join("")}
      <div class="menu-none" id="none" hidden></div>
      ${noteHTML("Preview menu: dish names and prices stand in until Basil sends their card. Every photograph is a frame from their own Instagram; the rest wear their highlight doodles.")}
    </div>`;

  return {
    html,
    title: "Menu",
    mount(screen) {
      const $ = (s) => screen.querySelector(s);
      const input = $("#q"), clear = $("#q-x"), none = $("#none"), chips = $("#chips");
      const secs = [...screen.querySelectorAll(".msec")];

      const apply = () => {
        const term = norm(input.value);
        clear.hidden = !term;
        let shown = 0;
        secs.forEach((s) => {
          let hits = 0;
          s.querySelectorAll(".mrow").forEach((r) => {
            const ok = !term || r.dataset.q.includes(term);
            r.hidden = !ok;
            if (ok) hits++;
          });
          const inChip = term ? true : cat === "all" || s.dataset.c === cat;
          s.hidden = !inChip || hits === 0;
          if (!s.hidden) shown += hits;
        });
        none.hidden = shown > 0;
        if (!shown) {
          none.innerHTML = `<p class="empty-t">Nothing called “${esc(input.value.trim())}”</p><p class="empty-s">Try a dish, a drink, or something in it.</p>`;
        }
        chips.classList.toggle("dim", Boolean(term));
      };

      chips.addEventListener("click", (e) => {
        const b = e.target.closest(".chip");
        if (!b) return;
        cat = b.dataset.c;
        chips.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        input.value = "";
        apply();
        // the address follows the filter without a navigation: no hashchange, no re-render
        history.replaceState(history.state, "", cat === "all" ? "#/menu" : `#/menu?c=${cat}`);
        b.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        const bars = document.getElementById("topbar").offsetHeight + screen.querySelector(".chips-bar").offsetHeight;
        const top = $("#menu-body").getBoundingClientRect().top + scrollY - bars - 6;
        if (scrollY > top) scrollTo({ top, behavior: "smooth" });
      });
      input.addEventListener("input", apply);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur(); });
      clear.addEventListener("click", () => { input.value = ""; apply(); input.focus(); });
      apply();
      const on = chips.querySelector('[aria-pressed="true"]');
      if (on && on.dataset.c !== "all") chips.scrollLeft = Math.max(0, on.offsetLeft - chips.clientWidth / 2 + on.offsetWidth / 2);
      wireImages(screen);

      // arriving from the Search button: focus the field, then drop the flag from the address
      if (q.search === "1") {
        history.replaceState(history.state, "", cat === "all" ? "#/menu" : `#/menu?c=${cat}`);
        setTimeout(() => input.focus({ preventScroll: true }), 380);
      }
    },
  };
}
