# Reader pane readability — Inner Light and Inner Observation

**Date:** 2026-08-12
**Status:** implemented on `feat/reader-pane-readability`, pending owner review
**Related:** #93 (commentary numbering), #79 (unanchored Ohr Pnimi), #81
(unimported KM docx dialect)

## The report

> "reading the second and third pane is really painful sometimes, it looks
> like a blob of wall of text and if I take my eyes off I immediately lose
> where I was"

Followed by three proposals from the owner: narrow the Ari's column by
default, make the columns drag-resizable, and format the walls of text.

## What was actually wrong

Measured against the committed corpus, not eyeballed.

**The commentary pane rendered a flat list.** `CommentaryPane` sorted a
chapter's items by `order` and rendered them as sibling `<li>`s separated by
a 20px gap and nothing else — no headings, no rules, no grouping, no capped
measure. A chapter reaches 53 items (`part-02/chapter-01`,
`he-jerusalem-1956`) of multi-hundred-word prose.

**Its numbers counted a different thing than the pane beside it.** The
source pane numbers seifim; the commentary pane's marker is the item's
running `order`. Seif 1 of `part-01/chapter-01` alone carries 11 notes
(`{1:11, 2:1, 3:4, 4:3, 5:3}`), so reading seif 3 put "13" on screen beside
the source pane's "3" — the reported "10 on the Ari side, 13 on the Inner
Light side". Both numbers were correct; nothing said what either counted.

**Nothing persistent marked the reading position.** The cross-pane anchor
highlight is a 2s fade (`useHighlightedAnchor`). Once it fades there is no
"you are here" anywhere in the pane.

**Inner Observation had no structure to render at all.** Its segments arrive
as one html string each: 9 segments in `part-01/inner-observation-01`,
average 1,423 characters, longest **5,347** (~900 words), and `heading` set
on **none** of them. The paragraph boundaries exist only as `<br>` (9 of
them in that longest segment), and the print's one landmark is a bold
opening word (`<b>ראשית</b>`).

**The column widths split the space backwards.** Equal thirds gave the Ari's
5 short seifim the same width as their 22 items of commentary.

## What the sources do

- **The print / Sefaria's structure.** TES is sequential: a seif, then its
  Ohr Pnimi notes attached to it; Histaklut Pnimit is a separate index
  entirely, not a parallel track.
- **Classic Jewish layout** (tzurat hadaf, Mikraot Gedolot) wraps commentary
  around the line it explains. The mechanism is spatial adjacency.
- **Digital editions abandon that layout** and replace it with
  selection-driven panels: Sefaria segments the text and shows the
  connections _for the segment you clicked_, not a parallel scrolling
  column.
- **Sidenote practice** (Tufte, gwern) puts the ceiling around 10–15 notes
  per screen before margin layouts break down, and says long notes must
  collapse.

Three independently scrolling full-text columns is the one arrangement none
of them use, and 53 notes is far outside the range where showing everything
at once works.

## Design

### 1. Group commentary by seif, not by running order

`groupCommentaryBySeif` (pure, in `app/utils/commentaryGrouping.ts`) buckets
a section's items under the `targetSeif` each comments on, seifim ascending,
items within a group still by `order`. Unanchored items (`targetSeif`
absent — the corpus majority, 1,255 of 1,654) become a trailing `null`-seif
group rather than being dropped.

Each group gets a **sticky** `Seif N` heading. Sticky is what replaces the
faded highlight as the persistent position marker, and the shared number
kills the two-counters confusion: the pane's own visible number is now the
same number the source pane shows.

### 2. The whole chapter, always — with collapsible groups

An earlier revision of this change scoped the pane to the seif the reader was
on, behind a follow/whole-chapter toggle, because it was not yet known
whether this column is read straight through or dipped into.

It is read straight through. Owner, on seeing it: _"why is there a show all,
I like the divisions but it is better to have all seif all at once."_ The
toggle and its persisted preference were removed rather than left as chrome
answering a settled question.

What replaced it, at the owner's suggestion, is **reader-driven** rather than
automatic: every seif group is a `<details open>` whose sticky heading is its
`<summary>`, so a finished group can be folded away by clicking it. Inner
Observation's per-chapter sections get the same treatment — that pane
concatenates every inner-observation chapter in the part into one column and
is the longest continuous run of text in the reader.

`<details>` rather than a custom toggle because it carries keyboard
operation, the expanded/collapsed state for a screen reader, and in-page find
that can open a closed group — none of which a `<button>` + `v-if` gives.
Open by default, and deliberately not persisted: folding is a transient act
while reading, and a group silently still-closed on the next visit would read
as missing text.

`useCurrentSeif` survives the toggle's removal for the one thing that still
earns its place: accenting the heading of the seif the reader is on. It keeps
the cross-pane link the owner valued ("I do like that i know which seif points
to which inner light") visible, without hiding a single note or moving the
column under them.

Position comes from `useTrackedSeifPosition`, an `IntersectionObserver` over
the source pane's `[data-seif]` elements restricted to the top 35% of its
scroll container, writing into the shared `useCurrentSeif` state provided by
the reader page. It is deliberately separate from `useReaderState`: that is
the _anchor_ pipeline, a discrete activation that scrolls and flashes; this is
a continuous scroll-derived position that must never scroll anything.

### 3. Typography

- Each note stacks: its marker sits on its own line above its prose, not in
  a gutter beside it. A gutter spent 2.25rem of every line's width on a
  one-character marker, and horizontal space is the scarcer axis — three
  columns share the viewport and this one holds the longest prose in the
  corpus. Measured on `part-01/chapter-01` at 1440px, gutter -> stacked:
  body width 459px -> 495px, 45.9 -> 49.5 characters per line, and the
  22-note list got **shorter**, 13,441px -> 12,929px. The extra marker line
  costs less height than the wrapped lines the wider measure removes, so
  this is not the horizontal-for-vertical trade it looks like.
- A rule between notes (`.tes-commentary-item + .tes-commentary-item`).
- `max-w-[65ch]` on the commentary column — the cap `SourcePane` always had
  and the commentary pane never did.
- The BB English catchword (`<strong>Upper, simple light:</strong>`) styled
  as a lead-in. Hebrew editions carry no catchword, so it simply doesn't
  match there.
- The section heading (`Inner Light`) now renders only when it says
  something the pane header doesn't — a chapter with both sections, or a
  `histaklut-pnimit`-only chapter. Otherwise it printed the pane title's own
  words again, three lines below it.

### 4. Inner Observation gets its paragraphs back

`splitProseParagraphs` splits a segment on its `<br>`s; `ReaderSourceSegment`
renders them as separate `<p>`s behind an opt-in `splitParagraphs` prop.
Opt-in because a chapter seif's occasional `<br>` is a line break inside one
thought, and splitting it would misrepresent one seif as several. The print's
bold opening word is promoted to a signpost, and the column caps at 70ch.

### 5. Column widths

`0.8fr 1.1fr 1.1fr` for three panes, `0.85fr 1.15fr` for two — the Ari
narrowest. Its text reaches its own 65ch cap well before its column runs
out, so it loses nothing, and the longer half of the reading pair gets the
room that shortens its lines toward a comfortable measure.

## Deliberately not in this change

- **Drag-resizable columns.** The owner asked for these and they should
  happen — but as a refinement once the layout is right, not as the rescue.
  They are the largest of the three asks (handles, touch, keyboard, RTL,
  persistence) and a wider column of unbroken text is still unbroken text.
- **Taking Inner Observation out of the permanent third column.** Proposed
  and agreed in principle: it is part-scoped (identical on every chapter of
  its part), never syncs, and is a separate section in both the print and
  Sefaria. Moving it to an on-demand surface touches the grid, the mobile
  swipe track, the pane pill and the e2e specs — it wants its own change.
- **Study mode.** `StudyStream` discloses commentary inline per anchor and
  does not have the wall problem. Untouched.

## Found while measuring — not fixed here

**The English source markers are gematria values, the English commentary
markers are running order, and they disagree on screen.**

In `source.en-bb.json` for `part-01/chapter-01`, the inline marker text for
`op-11` is **"20"**, `op-12` is **"30"**, `op-13`–`op-16` are
**"40","50","60","70"**, and later seifim reach **"100","200","300","400"**.
Those are the gematria values of the printed Hebrew letters (כ=20, ל=30,
מ=40 … ת=400) — the same letters `label.he` carries correctly. Meanwhile
`commentary.en-bb.json`'s `label.en` for those items is `11, 12, 13…`.

So an English reader sees "20" in the Ari's text and "11" against the note it
points at. The Hebrew is internally consistent (letters on both sides); only
the English disagrees with itself.

This is content/importer territory (#81/#93), needs a decision on which
convention wins, and is out of scope here — but this change makes it more
visible by putting the two numbering systems side by side in a legible
layout. Filed as #96, with the corpus-wide measurement.

## Verification

`task check` — lint, format:check, typecheck, validate:content, unit tests,
generate, e2e. Plus a scripted browser pass at 1440px (en + he) and 390px
confirming: all 5 seif headings and 22 notes render at once; every group opens
by default and collapses on click; scrolling the source pane moves the
accented "current seif" heading; grid resolves to `384px 528px 528px`; no page
or console errors in either direction.
