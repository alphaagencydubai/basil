# Basil — PWA preview

An installable app preview for **Basil · Pasta & Pizza** (باسیل | پاستا | پیتزا), Valiasr · Roudaki, Tabriz.
Built by [Alpha Agency](https://alphaa.agency) as a proposal.

**Live:** https://alphaagencydubai.github.io/basil/
**Them:** [@basil.tabriz](https://instagram.com/basil.tabriz) · open every day, 13:00 – 24:00

No build step, no dependencies, no framework. Vanilla ES modules, one stylesheet,
a hash router and a service worker.

```bash
python3 serve.py              # http://localhost:8221
python3 scripts/smoke.py      # every screen, light, dark and wide, as contact sheets
python3 build.py              # stamp the build — run before every deploy
python3 scripts/build_assets.py   # re-trace the mark, re-cut the photographs (needs src/)
```

---

## What is theirs and what is ours

**Theirs, from their own Instagram:**

| | |
|---|---|
| The mark | The pinched fingers with a basil leaf and three snap strokes, traced to curves from their avatar (IoU 0.988). The strokes are split out so the opening screen can snap them |
| The colours | Their avatar's aqua `#CCF4FC` and the hand's green `#02593D`; the green of their tables; the tomato red of the flag in their bio, rationed to "hot" |
| The doodles | Every menu section wears a monoline doodle drawn in the style of their highlights (Pizza, Pasta, Sandwich, Lasagna, Friends) |
| Their line | «باسیل؛ به وقت ایتالیا» — Basil, on Italy time — taken at its word: Tabriz and Rome on the home screen |
| The photographs | Six frames from the top of their grid: two pizzas, the self-order kiosk, the tray of square pizza, a guest with a kraft bowl, focaccia |
| The room | The kiosk, the kraft bowls, the long green table — "Skip the kiosk queue" and "the friends' table" come from their own posts |
| Hours and place | 13:00 – 24:00, Valiasr · Roudaki, Tabriz, and their own map pin |

**Ours, and labelled as preview wherever it shows:**

- The menu — 43 dishes across 9 sections, names, descriptions and prices. Every
  photograph is theirs; the dishes without one wear a doodle. Prices are set
  against real 2026 Tabriz pizza-and-pasta menus.
- **Basil Club** — leaves (a leaf per 10,000 T), three tiers (Amico, Famiglia,
  Nonna), four rewards, and the **pizza stamp card**: a stamp for every pizza
  once it is served, the eighth on the house.
- The staff CRM's guest book: 164 invented guests. Only this phone's own member,
  orders and bookings are real.
- No telephone is published on their profile, so the app talks to them in
  Instagram DM.

Orders, leaves, stamps and bookings live in `localStorage` on the visitor's own
phone. **Nothing reaches Basil** — the footer says so on every screen.

---

## The screens

| | |
|---|---|
| **Opening** | Their avatar full screen — the hand on the aqua — and the snap, once per session |
| **Home** | The wordmark and the snapping mark, their line, Tabriz and Rome clocks with the open state, three photographs stuck on like their post stickers, their highlights as the way into the menu, what's out of the oven, the kiosk you can skip, the club and stamp card, the tray and the friends' table, their words, the street drawn, their grid |
| **Menu** | Nine sections, search across English and Persian, the plus adds as it comes, a tap opens choices (extra mozzarella, a dip for the crust, half-and-half trays, big bowls) |
| **Bag** | Table or takeaway, a note, a Basil Club voucher off the total, the leaves and stamps it will earn |
| **Order** | The number the counter calls, a ring that counts the oven down; leaves and stamps land when it is **served** |
| **Profile** | The member card with a QR for the till or the kiosk, the stamp card, the wallet, rewards, bookings, orders, every leaf in and out |
| **Stamp card** | Eight stamps, how it works, what a full card left in the wallet |
| **Book** | A table, the friends' table, or a pizza party — Basil confirms by message |
| **Basil CRM** | Behind a passcode, for staff — preview passcode **1300**, the hour Basil opens |

---

## Layout

```
index.html              one page; build.py inlines the opening screen and the preloads
css/app.css             the whole design system, light and dark
js/
  config.js             the business — address, hours, the club, the spaces
  data.js               the menu: every dish, its Persian name, its price
  doodles.js            the highlight-style doodles (48 × 48 monoline)
  store.js              the bag, the orders, the member, the stamp card
  crm.js                the sample guest book, and today's service
  chrome.js             the glass top bar and the minimising iOS tab bar
  router.js             hash routes; a fresh node per screen
  brand.js              generated — their mark, traced, snap strokes split out
  views/                home, menu, bag, order, profile, stamps, reserve, staff
assets/
  brand/ fonts/ icons/ photos/
scripts/
  build_assets.py       their screenshots → mark, photographs, icons, og card
  smoke.py              every screen, light, dark and wide
```

---

## Before this goes to Basil

- [ ] **Their real menu** — names, descriptions, prices. All 43 items are ours.
- [ ] **More photographs** — the six here are 390-pixel grid thumbnails. Full-size
      photos of the pizzas, pasta, lasagna, the room and the kiosk would lift every screen.
- [ ] **A telephone number**, if they want one beside the Instagram DM.
- [ ] **Confirm Basil Club** — leaves, stamps, tiers and rewards are Alpha's proposal.
- [ ] **Decide the language.** English with a Persian gloss on every dish; a full RTL build is a day's work.
- [ ] A real back end if this ships: orders, bookings and the guest book are all on-device.

---

Built by **Alpha Agency**, Dubai.
