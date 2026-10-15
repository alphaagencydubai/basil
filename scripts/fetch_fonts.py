#!/usr/bin/env python3
"""The faces Basil ships, and where they came from.

Bricolage Grotesque (variable, wght + opsz, latin) — Basil draws everything in
one rounded monoline; Bricolage is round-shouldered and a little hand-made at
display sizes, so it sets the wordmark, the titles and anything that speaks for
the house. Taken from the @fontsource-variable/bricolage-grotesque package
(OFL), file bricolage-grotesque-latin-opsz-normal.woff2.

IRANYekanX FaNum, Regular and Bold — every Persian word: the glosses under the
dishes, their line «باسیل؛ به وقت ایتالیا». Copied from the studio's templates
(~/Claude Code/templates/fonts), not fetched.

    python3 scripts/fetch_fonts.py      # re-copies the two Yekan weights on the Mac
"""
import pathlib
import shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "fonts"
TEMPLATES = pathlib.Path.home() / "Claude Code" / "templates" / "fonts"

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(TEMPLATES / "IRANYekanXFaNum-Regular.woff2", OUT / "yekan.woff2")
    shutil.copyfile(TEMPLATES / "IRANYekanXFaNum-Bold.woff2", OUT / "yekan-bold.woff2")
    print("  yekan.woff2, yekan-bold.woff2 copied from the templates")
