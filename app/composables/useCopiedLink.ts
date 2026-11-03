/**
 * Copies the canonical absolute URL of the seif the reader is looking at.
 *
 * The URL is `siteUrl` (the same runtime config `useLocalizedSeo` builds its
 * absolute og:image from) + the current localized route path + `#seif-N`, the
 * id `SourcePane` puts on each seif. Before the source pane has measured a
 * seif there is nothing to point at, so the link is the bare chapter URL.
 *
 * `copied` flips true on success and resets after `COPIED_RESET_MS`, for a
 * polite live-region confirmation. Prefers `navigator.clipboard`, which only
 * exists in secure contexts; falls back to a selected off-screen textarea and
 * `execCommand("copy")` so plain-http and older browsers still work.
 */
const COPIED_RESET_MS = 2000;

const copyWithTextarea = (text: string): boolean => {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.insetBlockStart = "0";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } finally {
    area.remove();
  }
};

export const useCopiedLink = () => {
  const route = useRoute();
  const { public: publicConfig } = useRuntimeConfig();
  const { currentSeif } = useCurrentSeif();

  const copied = ref(false);
  let resetTimer: ReturnType<typeof setTimeout> | undefined;

  const url = computed(() => {
    const hash = currentSeif.value === null ? "" : `#seif-${currentSeif.value}`;
    return `${publicConfig.siteUrl}${route.path}${hash}`;
  });

  const copy = async (): Promise<void> => {
    const ok = await Promise.resolve()
      .then(() => navigator.clipboard.writeText(url.value))
      .then(
        () => true,
        () => copyWithTextarea(url.value),
      );
    if (!ok) return;

    copied.value = true;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      copied.value = false;
    }, COPIED_RESET_MS);
  };

  onScopeDispose(() => clearTimeout(resetTimer));

  return { url, copied, copy };
};
