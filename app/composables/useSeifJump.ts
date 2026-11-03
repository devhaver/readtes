/**
 * The reader toolbar's "Go to seif" control: parses a typed seif number,
 * clamps it to the chapter's seif range, and takes the reader there.
 *
 * A seif is not an anchor in `useReaderState`'s sense — it is a plain
 * `id="seif-N"` DOM target (`sourceSegmentAnchorId`) that the mini-toc and
 * the cross-reference links already jump to by `scrollIntoView` + highlight
 * flash, so this does the same rather than driving the cross-pane anchor
 * sync (the commentary pane has no element with that id to find). The URL
 * hash is updated so the position is shareable and survives a reload.
 */
import { flashAnchorHighlight } from "~/utils/anchorHighlight";
import { prefersReducedMotion } from "~/utils/motion";
import { sourceSegmentAnchorId } from "~/utils/sourceSegments";

export type SeifNumberParse =
  | { status: "invalid" }
  | { status: "ok"; n: number }
  /** Parsed, but outside `1..max`; `n` is the value clamped into range. */
  | { status: "out-of-range"; n: number };

/**
 * Parses what the reader typed into a seif number. Accepts only plain
 * decimal digits (after trimming) — no sign, fraction or exponent, which
 * `Number()` would otherwise let through.
 */
export const parseSeifNumber = (raw: string, max: number): SeifNumberParse => {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed) || max < 1) return { status: "invalid" };

  const n = Number.parseInt(trimmed, 10);
  if (n >= 1 && n <= max) return { status: "ok", n };
  return { status: "out-of-range", n: Math.min(Math.max(n, 1), max) };
};

export const useSeifJump = (seifNumbers: () => number[]) => {
  const { t } = useI18n();
  const router = useRouter();

  const input = ref("");
  const error = ref("");

  const max = computed(() => Math.max(0, ...seifNumbers()));

  const scrollToSeif = (n: number) => {
    const target = document.getElementById(sourceSegmentAnchorId(n));
    if (!target) return;

    target.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    flashAnchorHighlight(target);
  };

  const jump = async () => {
    const parsed = parseSeifNumber(input.value, max.value);
    if (parsed.status === "invalid") {
      error.value = t("reader.jump.outOfRange", { max: max.value });
      return;
    }

    error.value =
      parsed.status === "out-of-range"
        ? t("reader.jump.outOfRange", { max: max.value })
        : "";
    input.value = String(parsed.n);

    await router.replace({ hash: `#${sourceSegmentAnchorId(parsed.n)}` });
    await nextTick();
    scrollToSeif(parsed.n);
  };

  return { input, error, jump };
};
