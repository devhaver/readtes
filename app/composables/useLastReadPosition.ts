/**
 * The reader's last position, persisted so the home page can offer a
 * "Continue reading" card.
 *
 * Hydration note (mirrors `useReaderMode`): the home page is prerendered, and
 * `localStorage` is unknowable there. `initOnMounted` keeps `position` at
 * `null` through the first client render so it matches the prerendered HTML,
 * and only reads storage after mount.
 */
import { useDebounceFn, useLocalStorage } from "@vueuse/core";

const STORAGE_KEY = "readtes:last-read-position";
const SAVE_DEBOUNCE_MS = 500;

export interface LastReadPosition {
  locale: string;
  /** The part's number, shown as "Part N". */
  part: number;
  /** `<partId>/<chapterSlug>`, e.g. `part-01/chapter-01`. */
  chapterId: string;
  /** `null` until the source pane has measured a seif. */
  seif: number | null;
  title: string;
  updatedAt: number;
}

export const useLastReadPosition = () => {
  const position = useLocalStorage<LastReadPosition | null>(STORAGE_KEY, null, {
    initOnMounted: true,
    // A `null` default makes vueuse guess its string serializer, which would
    // store "[object Object]".
    serializer: {
      read: (raw) => JSON.parse(raw) as LastReadPosition | null,
      write: (value) => JSON.stringify(value),
    },
  });

  // Debounced: the current seif changes continuously while scrolling, and
  // every write is a synchronous storage hit.
  const savePosition = useDebounceFn(
    (next: Omit<LastReadPosition, "updatedAt">) => {
      position.value = { ...next, updatedAt: Date.now() };
    },
    SAVE_DEBOUNCE_MS,
  );

  return { position, savePosition };
};
