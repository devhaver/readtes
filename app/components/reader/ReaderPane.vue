<script setup lang="ts">
// Generic pane chrome shared by the Source/Inner Light/Inner Observation panes: a
// header (`ReaderPaneHeader` — layer title + language <select> when
// there's more than one + the provenance badge) above a scroll
// container that carries the resolved version's `dir`/`lang` — the actual
// pane content (SourcePane etc.) is slotted in, and grabs this container
// via `useReaderPaneContainer()` for its own `useHighlightedAnchor`.
//
// Bounded height + internal scroll are unconditional (not `lg:`-gated):
// since T9, `MobileSwipePanes` gives every pane a bounded height below
// `lg` too (each swipe slide), not just in the `lg:grid` desktop layout —
// this is the one piece of chrome both layouts share, so it just always
// behaves like an independently-scrolling column.
import type { ContentVersion } from "~~/shared/types/content";

defineProps<{
  title: string;
  /** Language codes in display order; the header hides its select when length <= 1. */
  languageOptions: string[];
  modelValue: string | null;
  meta: ContentVersion | null;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const containerRef = provideReaderPaneContainer();

// In mobile panes mode this header joins the navbar and toolbar as an
// overlay above the pane body rather than a row above it, so the body can
// own the full viewport height — see `useReaderChromeOverlay`. Above `lg`
// (and in study mode) nothing here changes: the header stays a plain flow
// row and the body scrolls beneath it.
const overlay = useReaderChromeOverlay();
const headerRef = ref<HTMLElement | null>(null);
overlay.register("pane-header", headerRef);

const headerTop = overlay.offsetOf("pane-header");
const headerStyle = computed(() =>
  overlay.active.value
    ? {
        top: `${headerTop.value}px`,
        transform: `translateY(${overlay.shift.value}px)`,
      }
    : {},
);

/**
 * The body never moves; its *content* starts below the chrome. That is the
 * whole point — a scroller whose top edge stays put cannot make the text
 * jump when the chrome slides away. `scroll-padding` keeps `#seif-N` anchor
 * jumps from landing underneath it.
 */
const bodyStyle = computed(() =>
  overlay.active.value
    ? {
        paddingBlockStart: `${overlay.height.value}px`,
        scrollPaddingBlockStart: `${overlay.height.value}px`,
      }
    : {},
);
</script>

<template>
  <section class="tes-pane-shell" :class="overlay.active.value && 'relative'">
    <header
      ref="headerRef"
      :style="headerStyle"
      class="tes-pane-header"
      :class="[
        overlay.active.value &&
          'absolute inset-x-0 z-20 transition-transform duration-200 ease-out motion-reduce:transition-none',
      ]"
    >
      <ReaderPaneHeader
        :title="title"
        :language-options="languageOptions"
        :model-value="modelValue"
        :meta="meta"
        class="flex-1"
        @update:model-value="(value) => emit('update:modelValue', value)"
      />

      <slot name="toast" />
    </header>

    <div
      ref="containerRef"
      :style="bodyStyle"
      class="tes-pane-body"
      :dir="meta?.direction ?? 'ltr'"
      :lang="meta?.language"
    >
      <slot />
    </div>
  </section>
</template>
