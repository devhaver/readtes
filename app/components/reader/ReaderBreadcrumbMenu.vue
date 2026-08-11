<script setup lang="ts">
// One breadcrumb-as-menu segment (T90): a disclosure button whose visible
// text stays whatever the reader page's own breadcrumb already renders
// ("Six volumes" / "Volume N"), revealing a plain nav list of links on
// click — the volumes list or the current volume's parts, never chapters
// (see `ReaderBreadcrumb`, which supplies `items`, and the content model
// skill's no-full-ToC-import rule). A disabled entry (`to: null`) covers a
// part with no chapters yet, same "coming soon" state as `/volumes`.
//
// Deliberately a plain link list (`nav`/`ul`/`NuxtLink`), not the full ARIA
// "menu button" pattern (`role="menu"`/`"menuitem"`) — that pattern expects
// items to never be real Tab stops, which would be a worse fit for a list
// of ordinary navigation links. Arrow Up/Down/Home/End roving focus and
// Escape-closes-and-returns-focus are layered on top as a keyboard
// convenience instead, queried live off the open panel the same way
// `useFocusTrap` finds its own focusable elements.
import { onClickOutside } from "@vueuse/core";

export interface BreadcrumbMenuItem {
  key: string;
  label: string;
  /** `null` when the target has no content yet — rendered disabled, not a link. */
  to: string | null;
  current: boolean;
}

defineProps<{
  triggerLabel: string;
  items: BreadcrumbMenuItem[];
  footerItem?: { label: string; to: string } | null;
}>();

const isOpen = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const buttonRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const panelId = useId();

const close = () => {
  isOpen.value = false;
};

const focusableLinks = (): HTMLElement[] =>
  panelRef.value
    ? Array.from(panelRef.value.querySelectorAll<HTMLElement>("a[href]"))
    : [];

const focusAt = (index: number) => {
  const links = focusableLinks();
  if (links.length === 0) return;
  const wrapped = (index + links.length) % links.length;
  links[wrapped]?.focus();
};

const openMenu = (focusIndex: number | null) => {
  isOpen.value = true;
  if (focusIndex === null) return;
  nextTick(() => focusAt(focusIndex));
};

const toggle = () => {
  if (isOpen.value) {
    close();
  } else {
    openMenu(0);
  }
};

const onTriggerKeydown = (event: KeyboardEvent) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    openMenu(0);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    openMenu(-1);
  }
};

const onItemClick = () => {
  close();
};

// Bound to `document` rather than the panel element (`useFocusTrap` does
// the same for its own Tab/Escape handling) so `vuejs-accessibility`'s
// no-static-element-interactions rule never has to weigh in on a plain
// wrapper `div` carrying a keyboard handler — guarded to only act while
// focus is actually somewhere inside this widget (the trigger button or
// one of the panel's own links), so it never intercepts keys meant for the
// rest of the page while the menu happens to still be open.
const onDocumentKeydown = (event: KeyboardEvent) => {
  if (!rootRef.value?.contains(document.activeElement)) return;

  const links = focusableLinks();
  const currentIndex = links.indexOf(document.activeElement as HTMLElement);

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      focusAt(currentIndex + 1);
      break;
    case "ArrowUp":
      event.preventDefault();
      focusAt(currentIndex - 1);
      break;
    case "Home":
      event.preventDefault();
      focusAt(0);
      break;
    case "End":
      event.preventDefault();
      focusAt(links.length - 1);
      break;
    case "Escape":
      event.preventDefault();
      close();
      buttonRef.value?.focus();
      break;
    case "Tab":
      close();
      break;
  }
};

watch(isOpen, (open, _previous, onCleanup) => {
  if (!open) return;
  document.addEventListener("keydown", onDocumentKeydown);
  onCleanup(() => document.removeEventListener("keydown", onDocumentKeydown));
});

onClickOutside(rootRef, close);
</script>

<template>
  <div ref="rootRef" class="relative inline-block">
    <button
      ref="buttonRef"
      type="button"
      class="inline-flex items-center gap-1 rounded-button hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      @click="toggle"
      @keydown="onTriggerKeydown"
    >
      {{ triggerLabel }}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-3 w-3 shrink-0"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      :id="panelId"
      ref="panelRef"
      class="absolute start-0 top-full z-40 mt-1 min-w-48 rounded-card border border-(--border) bg-(--surface) py-1 shadow-lg"
    >
      <nav :aria-label="triggerLabel">
        <ul class="flex flex-col">
          <li v-for="item in items" :key="item.key">
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="block px-3 py-2 text-sm text-(--text-primary) hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
              :class="item.current && 'font-semibold text-(--accent-text)'"
              :aria-current="item.current ? 'true' : undefined"
              @click="onItemClick"
            >
              {{ item.label }}
            </NuxtLink>
            <span
              v-else
              class="block px-3 py-2 text-sm text-(--text-muted) opacity-60"
            >
              {{ item.label }}
            </span>
          </li>
          <li v-if="footerItem" class="border-t border-(--border)">
            <NuxtLink
              :to="footerItem.to"
              class="block px-3 py-2 text-sm text-(--accent-text) hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
              @click="onItemClick"
            >
              {{ footerItem.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>
