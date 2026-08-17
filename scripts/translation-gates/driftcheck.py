#!/usr/bin/env python3
"""Mechanical drift check for a returned Ohr Pnimi translation batch.

Usage: python3 driftcheck.py en-001 [en-002 ...]

Checks only what is greppable and objectively wrong. A clean run does NOT mean
the English is good; it means the batch is worth reading closely.
"""
import json
import re
import sys
from collections import Counter

import os
SCRATCH = os.environ.get("TX_SCRATCH") or os.getcwd()  # set TX_SCRATCH, or run from the dir holding chs-*.json / out-*.json

HEB = re.compile(r"[֐-׿]")
TAGS = ("<b>", "</b>", "<br>", "<br/>", "<br />", "<small>", "</small>")

# term -> human explanation. Case-insensitive substring bans.
BANNED = {
    r"\bthe Rav\b": "must be 'the ARI'",
    r"\bphase [1-5]\b": "phase ordinals spelled as words (phase four)",
    r"\bReshimo\b": "רשימו is 'record'",
    r"\bReshimot\b": "רשימו is 'record'",
    r"\bbackside\b": "אחורים is 'posterior'",
    r"\bback side\b": "אחורים is 'posterior'",
    r"\bZeir Anpin \(ZA\)": "gloss style: no parenthetical acronyms",
    r"\bs\.v\.\b": "ד\"ה is 'the passage beginning'",
    r"\bibid\b": "not a convention in this run",
    r"\bTranslator": "no translator notes",
    r"\bNote:": "no notes of your own",
    r"\bi\.e\.\b": "spell it out",
    r"\be\.g\.\b": "spell it out",
    r"\bAri\b(?!sing)": "capitalised as 'the ARI'",
    r"\bYeshsut\b": "YESHSUT",
    # Glossary-locked forms. The wider en-ai corpus and the official English
    # both use the right-hand form; this run's early batches drifted.
    r"\bGvura": "גבורה is 'Gevura' (glossary canonicalEn; 545 hits corpus-wide vs 68)",
    r"\bDa[’']at\b": "Daat, no apostrophe (712 hits corpus-wide vs 65)",
    r"openings of the Ey": "נקבי עינים is 'Nikvey Einayim' (glossary-locked)",
    r"upper Aba and Ima": "או\"א עילאין is 'the upper AVI' (official English)",
    # Transliterations this corpus does not use. Three translators in round 6
    # independently generalised one glossed occurrence in a part-9 pane into a
    # global rule and wrote these into 83 places. Word-boundary counts over
    # content/parts/*/chapters/*/commentary.en-ai.json: 0 each (the raw
    # substring hits are Klipa/Klipot).
    r"\bKli\b": "כלי is 'vessel' (0 occurrences of 'Kli' in the commentary corpus)",
    r"\bKelim\b": "כלים is 'vessels' (0 occurrences in the commentary corpus)",
    r"\bZivug(?:im)?\b": "זווג is 'coupling' (glossary strategy: translate)",
    r"\bMasach(?:im)?\b": "מסך is 'screen' (0 occurrences in the commentary corpus)",
    r"Sub Header": "ד\"ה is 'the passage beginning' in this run",
    r"\bYesod of Nukva\b(?# harmless, placeholder)": None,
}
BANNED = {k: v for k, v in BANNED.items() if v}

# Required renderings when the Hebrew trigger is present in the source item.
CITATION = {
    "ד\"ה": (r"the passage beginning", "ד\"ה → 'the passage beginning'"),
    "עש\"ה": (r"study\s+(?:it\s+)?there\b", "עש\"ה → 'study it there well'"),
    "עכ\"ל": (r"End of quote", "עכ\"ל → 'End of quote'"),
    "וז\"ל": (r"and these are his words", "וז\"ל → 'and these are his words'"),
    "אכמ\"ל": (r"not the place to elaborate", "אכמ\"ל → 'this is not the place to elaborate'"),
}


def load_chapters(path):
    """Accept either a full export manifest or a bare extracted chapters list."""
    d = json.load(open(path))
    return {"chapters": d} if isinstance(d, list) else d


def count_tags(s):
    c = Counter()
    for t in TAGS:
        c[t] = s.count(t)
    c["<br>"] = c["<br>"] + c["<br/>"] + c["<br />"]
    del c["<br/>"], c["<br />"]
    return c


def check(batch):
    src = load_chapters(f"{SCRATCH}/chs-{batch}.json")
    try:
        out = json.load(open(f"{SCRATCH}/out-{batch}.json"))
    except FileNotFoundError:
        print(f"[{batch}] MISSING out-{batch}.json")
        return 1

    items = {}
    order = []
    for ch in src["chapters"]:
        for it in ch["items"]:
            k = (ch["chapterId"], it["anchorId"])
            items[k] = it["he"]
            order.append(k)

    problems = []
    if out.get("batch") != batch:
        problems.append(f"batch field is {out.get('batch')!r}, expected {batch!r}")

    tr = out.get("translations", [])
    got = [(t.get("chapterId"), t.get("anchorId")) for t in tr]
    if len(tr) != len(order):
        problems.append(f"item count {len(tr)} != manifest {len(order)}")
    missing = [k for k in order if k not in set(got)]
    extra = [k for k in got if k not in items]
    dupes = [k for k, n in Counter(got).items() if n > 1]
    for k in missing:
        problems.append(f"MISSING item {k[0]} {k[1]}")
    for k in extra:
        problems.append(f"EXTRA item {k[0]} {k[1]} (not in manifest)")
    for k in dupes:
        problems.append(f"DUPLICATE item {k[0]} {k[1]}")
    if got and got != order and not missing and not extra and not dupes:
        problems.append("items are not in source order")

    for t in tr:
        k = (t.get("chapterId"), t.get("anchorId"))
        he = items.get(k)
        if he is None:
            continue
        html = t.get("html") or ""
        tag = f"{k[0]} {k[1]}"

        if not html.strip():
            problems.append(f"{tag}: empty html")
            continue

        sc, tc = count_tags(he), count_tags(html)
        for name in ("<b>", "</b>", "<br>", "<small>", "</small>"):
            if sc[name] != tc[name]:
                problems.append(f"{tag}: {name} count {tc[name]} != source {sc[name]}")

        if '"' in html:
            problems.append(f"{tag}: {html.count(chr(34))} straight double quote(s) — use “ ”")
        # straight apostrophe: Da'at and other transliterated ayin/aleph
        # markers legitimately use it (168 merged items agree); possessives
        # should be curly. Minor, so labelled as such.
        stripped = re.sub(r"\b(?:Da|Ba|Ta|Ma|Sa)'(?:at|al|am|an)\b", "", html)
        if "'" in stripped:
            problems.append(
                f"{tag}: minor — {stripped.count(chr(39))} straight apostrophe(s) outside a transliteration; use ’"
            )

        heb = HEB.findall(html)
        if heb:
            # letter glosses like [י] are allowed; flag anything longer than a
            # single bracketed letter run
            bare = re.sub(r"\[[֐-׿]{1,4}\]", "", html)
            left = HEB.findall(bare)
            if left:
                snippets = re.findall(r".{0,25}[֐-׿]+.{0,25}", bare)[:3]
                problems.append(
                    f"{tag}: {len(left)} Hebrew char(s) outside a bracketed gloss: {snippets}"
                )

        # Source-conditional: "thickness"/"roughness" are only wrong when they
        # render עביות. עובי (physical thickness of the three lines) is a
        # different word and legitimately reads "thickness".
        if "עביות" in he:
            for w in ("roughness", "thickness"):
                if re.search(rf"\b{w}\b", html):
                    problems.append(f"{tag}: {w!r} where the source has עביות — use 'coarseness'")

        # 'imprint' is only wrong for רשימו (which is 'record'). It is the
        # attested rendering of ציור, so ban it only when רשימו is present.
        if "רשימו" in he and re.search(r"\bimprint\b", html):
            problems.append(f"{tag}: 'imprint' where the source has רשימו — use 'record'")

        for pat, why in BANNED.items():
            for m in re.finditer(pat, html):
                problems.append(f"{tag}: banned {m.group(0)!r} — {why}")

        for trigger, (need, why) in CITATION.items():
            if trigger in he and not re.search(need, html, re.I):
                problems.append(f"{tag}: source has {trigger} but output lacks — {why}")

        # gematria page refs: 'page' followed by non-digit
        for m in re.finditer(r"page\s+(?!\d)(\S+)", html):
            problems.append(f"{tag}: 'page {m.group(1)}' — page refs must be Arabic numerals")

        # Expansion sanity. Measured over the 168 already-merged items:
        # min 1.42, p5 1.59, median 1.79, p95 1.94, max 2.13. Outside
        # 1.35-2.30 means a clause was dropped or something was invented.
        ratio = len(html) / max(len(he), 1)
        # Cross-reference-only items ("עי' לעיל דף תתקל"ט אות קל"ח") are a
        # handful of characters and legitimately compress — a page number is
        # shorter spelled in digits than in Hebrew letters. The ratio only
        # means something over a paragraph or more.
        if len(he) < 120:
            pass
        elif ratio < 1.35:
            problems.append(f"{tag}: expansion {ratio:.2f}x looks compressed — clause dropped? (len {len(html)} vs he {len(he)})")
        elif ratio > 2.30:
            problems.append(f"{tag}: expansion {ratio:.2f}x looks padded — added commentary? (len {len(html)} vs he {len(he)})")

    if problems:
        print(f"[{batch}] {len(problems)} problem(s):")
        for p in problems:
            print("   -", p)
    else:
        print(f"[{batch}] clean — {len(tr)} items, mechanical checks pass")
    return len(problems)


if __name__ == "__main__":
    total = sum(check(b) for b in sys.argv[1:])
    print(f"\ntotal problems: {total}")
    sys.exit(1 if total else 0)
