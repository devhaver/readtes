<script setup lang="ts">
import type { LocaleObject } from "@nuxtjs/i18n";

// A disclosure menu rather than a row of links: nine languages in a row
// pushed the site name onto two lines on desktop and ran off a phone's
// edge. A native `<details>` keeps every link in the server-rendered markup
// — the prerender crawler discovers each language's pages through them —
// and opens without JavaScript.
const { locale, locales, defaultLocale, t } = useI18n();
const switchLocalePath = useSwitchLocalePath();
const route = useRoute();

const availableLocales = computed(() => locales.value as LocaleObject[]);
const current = computed(() =>
  availableLocales.value.find((entry) => entry.code === locale.value),
);

// `switchLocalePath` resolves through the router, which has no route on the
// 404 page — it returns '' there, and every link lost its href. Swap the
// locale prefix on the current path by hand instead (the root path lands on
// that language's home page).
const swapPrefix = (code: string): string => {
  const prefix = new RegExp(
    `^/(${availableLocales.value.map((entry) => entry.code).join("|")})(?=/|$)`,
  );
  const bare = route.path.replace(prefix, "") || "/";
  if (code === defaultLocale) return bare;
  return bare === "/" ? `/${code}` : `/${code}${bare}`;
};

// `switchLocalePath` already carries the current hash; the fallback has to
// add it itself so switching language keeps the reader's place.
const hrefFor = (code: typeof locale.value): string =>
  switchLocalePath(code) || swapPrefix(code) + route.hash;

const menu = ref<HTMLDetailsElement | null>(null);
const summary = ref<HTMLElement | null>(null);
const close = (): void => {
  if (menu.value) menu.value.open = false;
};

const activeMenu = useActiveNavMenu();
const openOverlays = useOpenOverlayCount();

// Keep the shared "which menu is open" state in step with the element, and
// close when the mobile nav (or any overlay) takes over.
const onToggle = (): void => {
  if (menu.value?.open) {
    activeMenu.value = "language";
  } else if (activeMenu.value === "language") {
    activeMenu.value = null;
  }
};
watch(activeMenu, (name) => {
  if (name !== "language") close();
});
watch(openOverlays, (count) => {
  if (count > 0) close();
});

// Close on navigation, like any other menu.
watch(() => route.fullPath, close);

const links = (): HTMLElement[] =>
  menu.value
    ? Array.from(menu.value.querySelectorAll<HTMLElement>("a[href]"))
    : [];

const focusAt = (index: number): void => {
  const items = links();
  if (items.length === 0) return;
  items[(index + items.length) % items.length]?.focus();
};

// Bound to `document` (the breadcrumb menus do the same) and guarded to
// focus inside this widget, so it never swallows keys meant for the page.
const onKeydown = (event: KeyboardEvent): void => {
  if (!menu.value?.contains(document.activeElement)) return;
  const isOpen = menu.value.open;

  if (event.key === "Escape") {
    if (!isOpen) return;
    close();
    summary.value?.focus();
    return;
  }

  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  const down = event.key === "ArrowDown";
  if (!isOpen) {
    menu.value.open = true;
    nextTick(() => focusAt(down ? 0 : -1));
    return;
  }
  const index = links().indexOf(document.activeElement as HTMLElement);
  // From the summary, Down enters the list at the top and Up at the bottom.
  focusAt(index === -1 ? (down ? 0 : -1) : index + (down ? 1 : -1));
};

// A tap or click elsewhere on the page closes the menu...
const onPointerdown = (event: PointerEvent): void => {
  if (!menu.value?.open) return;
  if (!menu.value.contains(event.target as Node)) close();
};

// ...and so does focus moving on to something else (Tab out of the list, or
// a programmatic focus) — otherwise the open list kept covering the
// controls that focus had just landed on.
const onFocusout = (event: FocusEvent): void => {
  const next = event.relatedTarget as Node | null;
  if (next && !menu.value?.contains(next)) close();
};

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("pointerdown", onPointerdown);
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("pointerdown", onPointerdown);
});
</script>

<template>
  <nav :aria-label="t('nav.languageSwitcherLabel')">
    <details
      ref="menu"
      class="tes-language-menu relative"
      @toggle="onToggle"
      @focusout="onFocusout"
    >
      <summary
        ref="summary"
        class="tes-focus-ring tes-focus-ring-inverse tes-touch-target flex cursor-pointer list-none items-center gap-1.5 rounded-button px-2 py-1 text-sm text-surface-white/90 hover:text-teal [&::-webkit-details-marker]:hidden"
      >
        <span class="sr-only">{{ t("nav.languageSwitcherLabel") }}:</span>
        <span class="tes-chrome-lang" :lang="current?.code">{{
          current?.name
        }}</span>
        <span
          aria-hidden="true"
          class="tes-icon tes-icon-chevron-down h-3.5 w-3.5"
        />
      </summary>
      <ul
        class="absolute end-0 z-50 mt-1 flex min-w-40 flex-col rounded-card border border-(--border) bg-(--surface) py-1 shadow-lg"
      >
        <li v-for="entry in availableLocales" :key="entry.code">
          <NuxtLink
            :to="hrefFor(entry.code)"
            class="tes-focus-ring tes-chrome-lang block px-3 py-1.5 text-sm"
            :class="
              entry.code === locale
                ? 'font-medium text-(--accent-text)'
                : 'text-(--text-primary) hover:bg-(--surface-raised)'
            "
            :aria-current="entry.code === locale ? 'true' : undefined"
            :hreflang="entry.language"
            :lang="entry.code"
            @click="close"
          >
            {{ entry.name }}
          </NuxtLink>
        </li>
      </ul>
    </details>
  </nav>
</template>
