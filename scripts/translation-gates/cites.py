#!/usr/bin/env python3
"""Pre-compute every page citation in a batch, so translators never do gematria.

Usage: python3 cites.py en-001 [en-002 ...]  ->  writes cites-<batch>.md
"""
import json, re, sys, os
OUT = os.environ.get("TX_SCRATCH") or os.getcwd()  # holds chs-<batch>.json
VALUES = {"א":1,"ב":2,"ג":3,"ד":4,"ה":5,"ו":6,"ז":7,"ח":8,"ט":9,"י":10,
          "כ":20,"ך":20,"ל":30,"מ":40,"ם":40,"נ":50,"ן":50,"ס":60,"ע":70,
          "פ":80,"ף":80,"צ":90,"ץ":90,"ק":100,"ר":200,"ש":300,"ת":400}
value = lambda t: sum(VALUES.get(c, 0) for c in t)
NUMERAL = r"[א-ת]+(?:[\"״'׳][א-ת]+)?['׳]?"
IDIOM = {'ד"ה', "ד״ה"}

# A numeral carries gershayim (מ"ה) or is one or two letters with a
# geresh (י'). Anything else after דף/אות is an ordinary word.
is_numeral = lambda t: bool(re.search(r"[\"״'׳]", t)) or len(t.rstrip("'׳")) <= 2

REF = re.compile(rf"(?<![א-ת])ב?(?:דף|רף|דך)\s+({NUMERAL})(?:\s+({NUMERAL}))?")
# The lookbehind matters: without it "אות" matches inside נקראות.
ITEM = re.compile(rf"(?<![א-ת])אות\s+({NUMERAL})")

for batch in sys.argv[1:]:
    rows = []
    BARE = re.compile(rf"(?<![א-ת])(?:אלף|א['׳])\s+({NUMERAL})")
    for ch in json.load(open(f"{OUT}/chs-{batch}.json", encoding="utf-8")):
        for it in ch["items"]:
            he = it["he"]
            for m in REF.finditer(he):
                tok, nxt = m.group(1), m.group(2)
                if not is_numeral(tok):
                    continue
                if tok in IDIOM:
                    rows.append((ch["chapterId"], it["anchorId"], m.group(0), "— idiom 'the passage beginning', NOT a page"))
                    continue
                if tok.rstrip("'׳") in ("אלף", "א"):
                    n = 1000 + (0 if (not nxt or nxt in IDIOM) else value(nxt))
                else:
                    n = value(tok)
                rows.append((ch["chapterId"], it["anchorId"], m.group(0), f"page {n}"))
            for m in BARE.finditer(he):
                if not is_numeral(m.group(1)) or REF.search(he[max(0, m.start()-4):m.start()]):
                    continue
                rows.append((ch["chapterId"], it["anchorId"], m.group(0), f"page {1000 + value(m.group(1))} (cited without דף)"))
            for m in ITEM.finditer(he):
                if not is_numeral(m.group(1)):
                    continue
                rows.append((ch["chapterId"], it["anchorId"], m.group(0), f"item {value(m.group(1))}"))
    lines = [f"# Pre-computed citations for {batch}", "",
             "Every `דף` page number and `אות` item number in your batch, already",
             "converted. **Use these numbers verbatim** — do not recompute gematria.",
             "Note how far past 1,000 the page numbers run.", "",
             "**`אות` also means 'letter'.** Where the sentence reads `אות ה' של אלקים`",
             "('the letter Hey of Elokim'), that row is a false positive — skip it.", "",
             "| chapter | item | printed | write |", "| --- | --- | --- | --- |"]
    for c, a, printed, en in rows:
        lines.append(f"| {c} | {a} | `{printed}` | {en} |")
    if not rows:
        lines.append("| — | — | (no page or item citations in this batch) | — |")
    open(f"{OUT}/cites-{batch}.md", "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(f"cites-{batch}.md: {len(rows)} citation(s)")
