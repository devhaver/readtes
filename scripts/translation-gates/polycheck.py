#!/usr/bin/env python3
"""Mechanical check of a returned batch in any language other than English.

Usage: TX_SCRATCH=<dir> python3 polycheck.py --lang ru ru-001 [ru-002 ...]

<dir> holds chs-<batch>.json (the extracted chapters) and out-<batch>.json
(the returned translations). Like driftcheck.py for English, a clean run does
not mean the translation is good — only that nothing greppable is wrong.

Checks: item-set equality and order, tag counts against the Hebrew, Hebrew
leakage, straight quotes, the right script for the language (and Ukrainian
that is not Russian), the expansion ratio, and the `required` / `banned`
patterns of docs/translation/terms-<lang>.json.
"""
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRATCH = os.environ.get("TX_SCRATCH") or os.getcwd()

HEB = re.compile(r"[֐-׿]")
TAG = re.compile(r"<[^>]+>")
TAGS = ("<b>", "</b>", "<small>", "</small>")
BR = re.compile(r"<br\s*/?>")
CYRILLIC = re.compile(r"[Ѐ-ӿ]")
LATIN = re.compile(r"[A-Za-zÀ-ɏ]")
CYRILLIC_LANGS = {"ru", "uk"}

# Output chars / Hebrew chars. Deliberately wide until calibrated on merged
# batches; the English run measured 1.35–2.30 (median ≈1.79). Bnei Baruch's
# own translations of the Introduction and the Preface run 1.27 (tr) to 1.81
# (de) against the same Hebrew, so this band is wider still on both sides.
RATIO = (1.1, 2.9)

args = sys.argv[1:]
if "--lang" not in args:
    sys.exit("usage: TX_SCRATCH=<dir> python3 polycheck.py --lang <code> <batch> …")
i = args.index("--lang")
lang = args[i + 1]
batches = args[:i] + args[i + 2:]

terms_path = os.path.join(REPO, "docs", "translation", f"terms-{lang}.json")
terms = json.load(open(terms_path, encoding="utf-8")) if os.path.exists(terms_path) else {}
banned = [(re.compile(b["pattern"]), b.get("why", "")) for b in terms.get("banned", [])]
required = []
for r in terms.get("required", []):
    trigger = r.get("heRegex") or re.escape(r["he"])
    required.append((re.compile(trigger), re.compile(r["pattern"]), r.get("why", "")))

plain = lambda html: TAG.sub("", html)


def check(batch):
    chs = json.load(open(f"{SCRATCH}/chs-{batch}.json", encoding="utf-8"))
    out = json.load(open(f"{SCRATCH}/out-{batch}.json", encoding="utf-8"))
    key = lambda c, it: (c["chapterId"], str(it.get("anchorId", it.get("n"))))
    want = [key(c, it) for c in chs for it in c["items"]]
    he = {key(c, it): it["he"] for c in chs for it in c["items"]}
    got = [(t["chapterId"], str(t.get("anchorId", t.get("n")))) for t in out["translations"]]
    html = {(t["chapterId"], str(t.get("anchorId", t.get("n")))): t["html"] for t in out["translations"]}
    problems = []
    if got != want:
        missing = [k for k in want if k not in html]
        extra = [k for k in got if k not in he]
        problems.append(f"item set/order differs (missing {missing[:5]}, extra {extra[:5]})")
    for k in want:
        if k not in html:
            continue
        h, t = he[k], html[k]
        where = f"{k[0]} {k[1]}"
        for tag in TAGS:
            if h.count(tag) != t.count(tag):
                problems.append(f"{where}: {tag} {h.count(tag)} → {t.count(tag)}")
        if len(BR.findall(h)) != len(BR.findall(t)):
            problems.append(f"{where}: <br> {len(BR.findall(h))} → {len(BR.findall(t))}")
        text = plain(t)
        if HEB.search(text):
            problems.append(f"{where}: Hebrew letters in the output: {HEB.findall(text)[:6]}")
        if '"' in text:
            problems.append(f"{where}: straight double quote")
        if lang in CYRILLIC_LANGS:
            if LATIN.search(re.sub(r"\b[A-Z]{2,}\b", "", text)) and len(LATIN.findall(text)) > 20:
                problems.append(f"{where}: {len(LATIN.findall(text))} Latin letters in Cyrillic text")
        elif CYRILLIC.search(text):
            problems.append(f"{where}: Cyrillic letters in {lang} text")
        if lang == "uk":
            if re.search(r"[ыэъё]", text, re.I):
                problems.append(f"{where}: Russian-only letters (ы э ъ ё) in Ukrainian")
            if len(text) > 200 and not re.search(r"[іїєґ]", text, re.I):
                problems.append(f"{where}: no і/ї/є/ґ at all — is this Russian?")
        hl = len(plain(h))
        if hl >= 200:
            ratio = len(text) / hl
            if not RATIO[0] <= ratio <= RATIO[1]:
                problems.append(f"{where}: expansion ratio {ratio:.2f} outside {RATIO}")
        for pattern, why in banned:
            m = pattern.search(text)
            if m:
                problems.append(f"{where}: banned “{m.group(0)}” — {why}")
        for trigger, pattern, why in required:
            if trigger.search(plain(h)) and not pattern.search(text):
                problems.append(f"{where}: required form missing ({pattern.pattern}) — {why}")
    for p in problems:
        print(f"[{batch}] {p}")
    print(f"[{batch}] {'clean' if not problems else f'{len(problems)} problem(s)'} — {len(got)} items")
    return len(problems)


total = sum(check(b) for b in batches)
print(f"total problems: {total}")
sys.exit(1 if total else 0)
