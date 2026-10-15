#!/usr/bin/env python3
"""A look at every screen: the phone in both themes, and the wide layout.

    python3 scripts/smoke.py [base-url]      # default http://localhost:8221/

Shoots scripts/shots/smoke-*.png, stitches two contact sheets, and prints any
console error or step that failed. e2e.py is the suite that judges; this is for
looking at it.
"""
import pathlib
import sys

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8221/").rstrip("/") + "/"
OUT = pathlib.Path(__file__).resolve().parent / "shots"
OUT.mkdir(parents=True, exist_ok=True)
IPHONE = ("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 "
          "(KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")

# A member with points, a voucher and a booking, so no screen is shown empty.
SEED = """() => {
  const day = 86400000, now = Date.now();
  localStorage.setItem("basil.member", JSON.stringify({
    v: 1, id: "BS-SMOKE", name: "Sara Ahmadi", mobile: "09148056696",
    birthday: { jm: 5, jd: 12 }, joined: now - 120 * day, points: 1840, lifetime: 2140, stamps: 5, cards: 1,
    history: [{ at: now - day, pts: 120, why: "Order 214" }, { at: now - 9 * day, pts: -250, why: "A basil lemonade on us" },
              { at: now - 120 * day, pts: 100, why: "Welcome to Basil Club" }],
    wallet: [{ id: "v1", source: "stamps", ref: "s-pizza", label: "Your 8th pizza, on us", kind: "cat", cat: "pizza", pct: 0, cap: 0,
               claimed: now - day, expires: now + 40 * day, usedOn: null }],
    prefs: { seating: "window", heat: "hot", offers: true, notes: "" }, referral: "SARA317",
  }));
  localStorage.setItem("basil.orders", JSON.stringify([{
    id: "o1", code: "214", at: now - 40 * 60000, ready: now - 26 * 60000, mode: "table", table: "9",
    note: "", name: "Sara", lines: [{ id: "pepperoni", name: "Pepperoni Piccante", fa: "پپرونی تند", qty: 1, opts: {}, label: "", unit: 1190000 },
      { id: "basil-lemonade", name: "Basil Lemonade", fa: "لیموناد ریحان", qty: 2, opts: {}, label: "", unit: 290000 }],
    subtotal: 1770000, discount: 0, voucher: null, total: 1770000, points: 177,
    member: "BS-SMOKE", status: "served", credited: true }]));
  localStorage.setItem("basil.reservations", JSON.stringify([{
    id: "r1", ref: "BS-7KQ2", space: "friends", when: now + 3 * day, guests: 6, occasion: "friends",
    name: "Sara Ahmadi", mobile: "09148056696", note: "", status: "requested", made: now - day, member: "BS-SMOKE" }]));
  localStorage.setItem("basil.bag", JSON.stringify([
    { key: "ham-tomato|crust=std&dip=none", id: "ham-tomato", qty: 1, opts: { crust: "std", dip: "none" } },
    { key: "lasagna|", id: "lasagna", qty: 1, opts: {} },
    { key: "basil-lemonade|ice=normal&sweet=normal", id: "basil-lemonade", qty: 2, opts: { sweet: "normal", ice: "normal" } }]));
  sessionStorage.setItem("basil.staff", "1");
}"""

ROUTES = [
    ("home", "#/", 0), ("home-mid", "#/", 1500), ("menu", "#/menu", 0), ("menu-mid", "#/menu", 900),
    ("bag", "#/bag", 0), ("order", "#/order/o1", 0), ("profile", "#/profile", 0),
    ("profile-mid", "#/profile", 1200), ("stamps", "#/stamps", 0), ("reserve", "#/reserve", 0),
    ("booking", "#/reservation/r1", 0), ("crm", "#/staff", 0), ("crm-mid", "#/staff", 900),
]

errors, shots = [], []


def sheet(files, name, tw, th, cols):
    if not files:
        return
    pad = 8
    rows = (len(files) + cols - 1) // cols
    img = Image.new("RGB", (cols * (tw + pad) + pad, rows * (th + 24 + pad) + pad), (238, 235, 230))
    draw = ImageDraw.Draw(img)
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGB").resize((tw, th), Image.LANCZOS)
        x, y = pad + (i % cols) * (tw + pad), pad + (i // cols) * (th + 24 + pad)
        img.paste(im, (x, y))
        draw.text((x + 2, y + th + 6), f.stem.replace("smoke-", ""), fill=(20, 18, 16))
    img.save(OUT / name, quality=86)
    print(f"  {name}  {len(files)} shots")


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)

        def run(tag, scheme, width, height, mobile):
            ctx = b.new_context(viewport={"width": width, "height": height}, device_scale_factor=2,
                                is_mobile=mobile, has_touch=mobile,
                                user_agent=IPHONE if mobile else None, color_scheme=scheme)
            pg = ctx.new_page()
            pg.on("pageerror", lambda e: errors.append(f"[{tag}] {e}"))
            pg.on("console", lambda m: errors.append(f"[{tag}] {m.text}") if m.type == "error" else None)
            pg.goto(BASE + "#/", wait_until="domcontentloaded")
            pg.evaluate(SEED)
            for name, route, y in ROUTES:
                try:
                    pg.goto("about:blank")
                    pg.goto(BASE + route, wait_until="domcontentloaded")
                    pg.wait_for_selector(".screen", timeout=20000)
                    pg.wait_for_timeout(2400)
                    if y:
                        pg.evaluate(f"() => scrollTo({{ top: {y}, behavior: 'instant' }})")
                        pg.wait_for_timeout(700)
                    path = OUT / f"smoke-{tag}-{name}.png"
                    pg.screenshot(path=str(path))
                    shots.append(path)
                except Exception as e:  # one broken screen should not hide the rest
                    errors.append(f"[{tag}] {name}: {str(e).splitlines()[0][:100]}")
            ctx.close()

        run("light", "light", 390, 844, True)
        run("dark", "dark", 390, 844, True)
        run("wide", "light", 1280, 900, False)
        b.close()

    sheet([s for s in shots if "-light-" in s.name], "sheet-light.jpg", 264, 572, 7)
    sheet([s for s in shots if "-dark-" in s.name], "sheet-dark.jpg", 264, 572, 7)
    sheet([s for s in shots if "-wide-" in s.name], "sheet-wide.jpg", 420, 295, 4)
    print(f"{len(shots)} shots → {OUT}")
    print("\n".join(errors) if errors else "no console errors, no failed steps")


if __name__ == "__main__":
    main()
