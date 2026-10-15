#!/usr/bin/env python3
"""Stamp the build. Run before every deploy.

1. Inline the opening screen into index.html — their monogram, still — so it
   paints with the first byte instead of waiting for the module graph.
2. Announce every module with a modulepreload link. ES imports are otherwise
   discovered one level at a time, one round trip per level, which from Tabriz
   to a GitHub Pages edge is most of a cold start. The links carry no ?v=, so
   they match the URLs the imports actually request.
3. Write the service worker's shell and asset lists from what is on disk, so a
   new module or photograph can never be missing from the offline copy.
4. Content-hash all of it into the worker's VERSION and the ?v= query strings,
   so a returning visitor never runs a stale mix of old and new.

    python3 build.py
"""
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent
idx = ROOT / "index.html"
sw = ROOT / "sw.js"


def block(html, name, inner):
    pat = re.compile(rf"<!-- {name}:start -->.*?<!-- {name}:end -->", re.S)
    return pat.sub(lambda _: f"<!-- {name}:start -->\n{inner}\n<!-- {name}:end -->", html)


def boot_block():
    """The opening: their hand on their aqua, the snap strokes left to snap in
    by CSS — read out of the generated brand module, so it can never drift from
    what the app draws."""
    brand = (ROOT / "js/brand.js").read_text(encoding="utf-8")
    vb = re.search(r'MARK_VIEWBOX = "([^"]+)"', brand).group(1)
    body = re.search(r'MARK_BODY = "([^"]+)"', brand).group(1)
    snaps = json.loads(re.search(r'MARK_SNAPS = (\[.*?\]);', brand, re.S).group(1))
    paths = "".join(f'<path class="snap s{i + 1}" fill="currentColor" d="{d}"/>' for i, d in enumerate(snaps))
    return ('<div id="boot" aria-hidden="true"><div class="boot-in"><div class="boot-mark">'
            f'<svg viewBox="{vb}" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="{body}"/>{paths}</svg>'
            '</div><div class="boot-word">BASIL</div><div class="boot-fa" lang="fa" dir="rtl">به وقت ایتالیا</div></div></div>')


mods = sorted(p.relative_to(ROOT).as_posix() for p in ROOT.glob("js/**/*.js"))
html = idx.read_text(encoding="utf-8")
html = block(html, "boot", boot_block())
html = block(html, "preload",
             "\n".join(f'<link rel="modulepreload" href="{m}">' for m in mods if m != "js/app.js"))
idx.write_text(html, encoding="utf-8")

shell = ["./", "./index.html", "./manifest.webmanifest", "./css/app.css"] + [f"./{m}" for m in mods]
assets = sorted(f"./{p.relative_to(ROOT).as_posix()}" for pat in
                ("assets/fonts/*.woff2", "assets/brand/*.svg", "assets/brand/*.png", "assets/icons/*.png", "assets/photos/*-sm.webp")
                for p in ROOT.glob(pat))
src = sw.read_text(encoding="utf-8")
fmt = lambda items: "\n".join(f'  "{u}",' for u in items)
src = re.sub(r"/\* shell:start \*/.*?/\* shell:end \*/",
             lambda _: f"/* shell:start */\n{fmt(shell)}\n  /* shell:end */", src, flags=re.S)
src = re.sub(r"/\* assets:start \*/.*?/\* assets:end \*/",
             lambda _: f"/* assets:start */\n{fmt(assets)}\n  /* assets:end */", src, flags=re.S)
sw.write_text(src, encoding="utf-8")

files = sorted([*ROOT.glob("js/**/*.js"), ROOT / "css/app.css", idx, ROOT / "manifest.webmanifest", sw])
h = hashlib.sha1()
for f in files:
    h.update(re.sub(rb'\?v=[0-9a-z]+|const VERSION = "basil-[^"]+";', b"", f.read_bytes()))
stamp = h.hexdigest()[:10]

sw.write_text(re.sub(r'const VERSION = "basil-[^"]+";', f'const VERSION = "basil-{stamp}";',
                     sw.read_text(encoding="utf-8")), encoding="utf-8")
html = idx.read_text(encoding="utf-8")
html = re.sub(r'css/app\.css(\?v=[0-9a-z]+)?', f"css/app.css?v={stamp}", html)
html = re.sub(r'js/app\.js(\?v=[0-9a-z]+)?"', f'js/app.js?v={stamp}"', html)
idx.write_text(html, encoding="utf-8")

print(f"build {stamp}: mark inlined, {len(mods) - 1} modules preloaded, "
      f"worker lists {len(shell)} shell + {len(assets)} assets")
