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
# Abbreviations that scan as numerals but end a citation list:
# וז"ל 'and these are his words', ע"ש 'see there', ע"ב the b-side of a folio.
STOP = {'ז"ל', 'ע"ש', 'ע"ב', 'ע"א', 'נ"ל', 'ע"כ', 'ה"ס', 'וכו',
        'דף', 'ודף', 'רף', 'דך', 'אות', 'ואות'}

# A numeral carries gershayim (מ"ה) or is one or two letters with a
# geresh (י'). Anything else after דף/אות is an ordinary word.
is_numeral = lambda t: bool(re.search(r"[\"״'׳]", t)) or len(t.rstrip("'׳")) <= 2

REF = re.compile(rf"(?<![א-ת])[וב]?(?:דף|רף|דך)\s+({NUMERAL})(?:\s+({NUMERAL}))?")
# The lookbehind matters: without it "אות" matches inside נקראות.
# ב?אות: "(באות קפ\"ט)" is "in item 189". The same string can be the verb
# "they come" (באות גם) — the is_numeral filter on the next token settles it.
ITEM = re.compile(rf"(?<![א-ת])ב?אות\s+({NUMERAL})")

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
            ref_spans = [(m.start(), m.end()) for m in REF.finditer(he)]
            for m in BARE.finditer(he):
                # 'דף א\' שע"ז' is one citation, not two: skip a bare match that
                # sits inside a דף match already reported above.
                if any(a <= m.start() < b for a, b in ref_spans):
                    continue
                if not is_numeral(m.group(1)):
                    continue
                # A bare thousand is only a citation in citation context.
                # 'דתיקון א\' עד פומא' is "correction 1, until the mouth" —
                # ordinal + preposition, and עד happens to scan as 74.
                before = he[max(0, m.start() - 18):m.start()]
                after = he[m.end():m.end() + 12]
                cue = ("(" in before or "לעיל" in before or "כנ\"ל" in before
                       or "עי'" in before or "ועי" in before or "ע\"ש" in after
                       or "ד\"ה" in after or "אות" in after)
                if not cue:
                    continue
                rows.append((ch["chapterId"], it["anchorId"], m.group(0), f"page {1000 + value(m.group(1))} (cited without דף)"))
            for m in ITEM.finditer(he):
                if not is_numeral(m.group(1)):
                    continue
                rows.append((ch["chapterId"], it["anchorId"], m.group(0), f"item {value(m.group(1))}"))
                # A list continues without repeating אות: 'אות קי"ז קי"ח וקי"ט'.
                tail = he[m.end():m.end() + 80]
                while True:
                    c = re.match(rf"\s+ו?({NUMERAL})", tail)
                    if not c or not is_numeral(c.group(1)) or c.group(1) in IDIOM | STOP:
                        break
                    tok = c.group(1)
                    # 'דף A אות B  C אות D' — a continuation followed by אות is
                    # the next PAGE in the list, not another item number.
                    kind = ("page" if re.match(r"\s+ו?אות(?![א-ת])", tail[c.end():])
                            else "item")
                    rows.append((ch["chapterId"], it["anchorId"], tok,
                                 f"{kind} {value(tok)} (continues the list)"))
                    tail = tail[c.end():]
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
