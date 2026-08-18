#!/usr/bin/env python3
"""Split export manifests into a translator brief plus one file per batch.

Usage: TX_SCRATCH=<dir> python3 scripts/translation-split.py [--lang en] en-001 en-002 …

Writes into <dir>:
  brief.md          the manifest's instructions + glossary, then docs/translation-rules.md
  chs-<batch>.json  that batch's chapters, extracted from the manifest

Never hand a translator the raw manifest — it is ~3,300 lines and the
glossary alone consumes a whole read budget.
"""
import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get("TX_SCRATCH") or os.getcwd()

args = sys.argv[1:]
lang = "en"
if "--lang" in args:
    i = args.index("--lang")
    lang = args[i + 1]
    del args[i:i + 2]
SRC = os.path.join(REPO, ".translation", lang)
batches = args
if not batches:
    sys.exit("usage: TX_SCRATCH=<dir> python3 scripts/translation-split.py [--lang en] en-001 …")

m = json.load(open(f"{SRC}/{batches[0]}.json"))
g = m["glossary"]

lines = ["# Ohr Pnimi → English — translator brief\n", m["instructions"], "\n## Glossary conventions\n"]
lines.append("```json\n" + json.dumps(g["conventions"], ensure_ascii=False, indent=1) + "\n```\n")
lines.append("## Known gaps\n")
lines.append("```json\n" + json.dumps(g["knownGaps"], ensure_ascii=False, indent=1) + "\n```\n")
lines.append(f"## Binding glossary ({len(g['entries'])} terms)\n")
lines.append("| Hebrew | canonicalEn | strategy | note |")
lines.append("| --- | --- | --- | --- |")
for e in g["entries"]:
    note = (e.get("note") or "").replace("\n", " ").replace("|", "/")
    lines.append(f"| {e['he']} | {e['canonicalEn']} | {e['strategy']} | {note} |")
rules = open(os.path.join(REPO, "docs", "translation-rules.md"), encoding="utf-8").read()
open(f"{OUT}/brief.md", "w").write("\n".join(lines) + "\n\n" + rules)

report = []
for b in batches:
    d = json.load(open(f"{SRC}/{b}.json"))
    json.dump(d["chapters"], open(f"{OUT}/chs-{b}.json", "w"), ensure_ascii=False)
    n = sum(len(c["items"]) for c in d["chapters"])
    parts = sorted({c["chapterId"].split("/")[0] for c in d["chapters"]})
    chs = [c["chapterId"] for c in d["chapters"]]
    has_target = sum(1 for c in d["chapters"] if c.get("context", {}).get("targetText"))
    report.append(
        {
            "batch": b,
            "items": n,
            "chars": d["sourceChars"],
            "parts": parts,
            "chapters": f"{chs[0]} … {chs[-1]}" if len(chs) > 1 else chs[0],
            "chapterCount": len(chs),
            "chaptersWithTargetText": has_target,
        }
    )
print(json.dumps(report, ensure_ascii=False, indent=1))
