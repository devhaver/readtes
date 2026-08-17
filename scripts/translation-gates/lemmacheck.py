#!/usr/bin/env python3
"""Flag bolded lemmas whose wording drifts from the pane line they quote.

A lemma quotes the Ari's text. The reader sees that same line rendered in the
pane beside it, so the words must match. Low n-gram overlap means they don't.
"""
import json, re, sys

import os
SCRATCH = os.environ.get("TX_SCRATCH") or os.getcwd()  # set TX_SCRATCH, or run from the dir holding chs-*.json / out-*.json
strip = lambda s: re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s)).strip()
norm = lambda s: re.sub(r"[^a-z ]", "", s.lower())


def grams(s, n=4):
    w = norm(s).split()
    return {" ".join(w[i:i + n]) for i in range(max(0, len(w) - n + 1))}


def load_chapters(path):
    """Accept either a full export manifest or a bare extracted chapters list."""
    d = json.load(open(path))
    return {"chapters": d} if isinstance(d, list) else d


def check(batch, threshold=0.55):
    src = load_chapters(f"{SCRATCH}/chs-{batch}.json")
    panes = {
        c["chapterId"]: strip(" ".join(x["html"] for x in (c["context"].get("targetText") or [])))
        for c in src["chapters"]
    }
    out = json.load(open(f"{SCRATCH}/out-{batch}.json"))
    flagged = 0
    for t in out["translations"]:
        pane = panes.get(t["chapterId"], "")
        if not pane:
            continue
        m = re.search(r"<b>(.*?)</b>", t["html"], re.S)
        if not m:
            continue
        lem = strip(m.group(1))
        g = grams(lem)
        if len(g) < 3:
            continue
        overlap = len(g & grams(pane)) / len(g)
        if overlap < threshold:
            flagged += 1
            print(f"  {t['chapterId']} {t['anchorId']}: {overlap:.0%} of lemma matches the pane")
            print(f"     lemma: {lem[:150]}")
    print(f"[{batch}] {flagged} lemma(s) below {threshold:.0%} overlap")
    return flagged


if __name__ == "__main__":
    sys.exit(1 if sum(check(b) for b in sys.argv[1:]) else 0)
