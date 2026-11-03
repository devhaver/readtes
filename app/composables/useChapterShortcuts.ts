/**
 * Global previous/next chapter keyboard shortcuts for the reader.
 *
 * `[` is previous and `]` is next, in every language and direction — the
 * brackets are RTL-neutral by design. Alt+ArrowLeft / Alt+ArrowRight are
 * accepted too and follow the document direction, the way the browser's own
 * history arrows do: in RTL, Alt+ArrowRight is previous.
 *
 * Ignored while focus is in a text field or contenteditable (the reader has
 * a search box and a preferences form) and when Ctrl/Meta/Shift are held, so
 * no browser or assistive-tech chord is hijacked.
 */
export type ChapterShortcut = "prev" | "next";

type ShortcutEvent = Pick<
  KeyboardEvent,
  "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "target"
>;

const isEditableTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element || typeof element.tagName !== "string") return false;
  return (
    element.isContentEditable ||
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT"
  );
};

export const resolveChapterShortcut = (
  event: ShortcutEvent,
  direction: "ltr" | "rtl",
): ChapterShortcut | null => {
  if (event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (isEditableTarget(event.target)) return null;

  if (!event.altKey) {
    if (event.key === "[") return "prev";
    if (event.key === "]") return "next";
    return null;
  }

  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return null;
  const towardStart = direction === "rtl" ? "ArrowRight" : "ArrowLeft";
  return event.key === towardStart ? "prev" : "next";
};

export const useChapterShortcuts = (
  links: () => { prev: string | null; next: string | null },
) => {
  const onKeydown = (event: KeyboardEvent) => {
    const direction = document.documentElement.dir === "rtl" ? "rtl" : "ltr";
    const shortcut = resolveChapterShortcut(event, direction);
    if (!shortcut) return;

    const to = links()[shortcut];
    if (!to) return;

    event.preventDefault();
    void navigateTo(to);
  };

  onMounted(() => document.addEventListener("keydown", onKeydown));
  onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
};
