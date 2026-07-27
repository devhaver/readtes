#!/usr/bin/env bash
# PostToolUse hook — enforces the two conventions that fail silently:
# physical CSS properties (breaks Hebrew RTL) and literal hex (bypasses tokens).
#
# Reads the hook payload on stdin, exits 2 with a message on stderr if the
# edited file violates either. Exit 2 feeds the message back to Claude.

set -uo pipefail

# jq preferred, python3 fallback — a missing parser makes this hook fail open
# (silently passing every edit), so don't let it depend on one binary. Never
# add 2>/dev/null here: if parsing breaks, it must be loud.
if command -v jq >/dev/null 2>&1; then
  f=$(jq -r '.tool_response.filePath // .tool_input.file_path // empty')
else
  f=$(python3 -c 'import json,sys
d = json.load(sys.stdin)
print(d.get("tool_response", {}).get("filePath") or d.get("tool_input", {}).get("file_path") or "")')
fi
[ -n "$f" ] || exit 0
[ -f "$f" ] || exit 0

# Only app/ source files. Everything else is out of scope for these two rules.
case "$f" in
  */app/*.vue | */app/*.css | app/*.vue | app/*.css) ;;
  *) exit 0 ;;
esac

violations=""

# Physical CSS utilities — Hebrew RTL requires logical equivalents.
# Suffixes are restricted to real Tailwind values (numeric, arbitrary [..],
# px/auto/full) so prose like "right-to-left" in a comment doesn't match.
physical=$(grep -nEo '(ml|mr|pl|pr|left|right)-(\[|[0-9]|px\b|auto\b|full\b)|(border|rounded)-[lr]-(\[|[0-9])|text-(left|right)\b' "$f" 2>/dev/null | head -5)
if [ -n "$physical" ]; then
  violations+="Physical CSS utilities found — use logical equivalents (ms-/me-/ps-/pe-/text-start/text-end/start-/end-):
$physical
"
fi

# Literal hex — everything comes from design tokens. main.css is where the
# tokens are defined, so it is the one legitimate place for hex.
case "$f" in
  */main.css) ;;
  *)
    hex=$(grep -nE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?\b' "$f" 2>/dev/null | head -5)
    if [ -n "$hex" ]; then
      violations+="Literal hex found — use a design token (semantic --surface/--text-* var, or a --color-* utility):
$hex
"
    fi
    ;;
esac

if [ -n "$violations" ]; then
  printf '%s\n%s' "$f violates project conventions:" "$violations" >&2
  exit 2
fi

exit 0
