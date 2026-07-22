<script setup lang="ts">
// The reading-preferences modal (T9): font-size scale, theme, and UI
// language, opened from `ReaderToolbar`'s type icon in every mode/
// breakpoint. Font scale is the only preference this component itself
// persists (`useReadingPreferences`) — theme already persists via
// `@nuxtjs/color-mode`'s own storage, and UI language is a real route
// (`switchLocalePath`), which `@nuxtjs/i18n` persists on its own.
import type { LocaleObject } from "@nuxtjs/i18n";
import type { SegmentedControlOption } from "~/components/ui/SegmentedControl.vue";
import {
  READING_SCALE_STEPS,
  type ReadingScale,
} from "~/composables/useReadingPreferences";
import { prefersReducedMotion } from "~/utils/motion";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const { t, locale, locales } = useI18n();
const switchLocalePath = useSwitchLocalePath();
const colorMode = useColorMode();
const { scale, setScale } = useReadingPreferences();

const titleId = useId();
const panelRef = ref<HTMLElement | null>(null);
const isOpen = computed(() => props.open);

const close = () => emit("close");
useFocusTrap(panelRef, isOpen, close);

const onBackdropClick = () => close();

const availableLocales = computed(() => locales.value as LocaleObject[]);

const fontSizeOptions = computed<SegmentedControlOption<string>[]>(() =>
  READING_SCALE_STEPS.map((step) => ({
    value: String(step),
    label: t(`reader.prefs.fontSize.step${step}`),
  })),
);
const fontSizeValue = computed(() => String(scale.value));
const onFontSizeChange = (value: string) => {
  setScale(Number.parseInt(value, 10) as ReadingScale);
};

const themeOptions = computed<SegmentedControlOption<string>[]>(() => [
  { value: "light", label: t("reader.prefs.theme.light") },
  { value: "dark", label: t("reader.prefs.theme.dark") },
  { value: "system", label: t("reader.prefs.theme.system") },
]);
const themeValue = computed(() => colorMode.preference);
const onThemeChange = (value: string) => {
  colorMode.preference = value;
};

const transitionDuration = computed(() =>
  prefersReducedMotion() ? "duration-0" : "duration-150",
);
</script>

<template>
  <Teleport to="body">
    <Transition
      :enter-active-class="`transition-opacity ${transitionDuration}`"
      :leave-active-class="`transition-opacity ${transitionDuration}`"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <button
        v-if="open"
        type="button"
        tabindex="-1"
        aria-hidden="true"
        class="fixed inset-0 z-50 cursor-default bg-black/40"
        @click="onBackdropClick"
      />
    </Transition>

    <Transition
      :enter-active-class="`transition-all ${transitionDuration} ease-out`"
      :leave-active-class="`transition-all ${transitionDuration} ease-in`"
      enter-from-class="opacity-0 scale-95"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="w-full max-w-sm rounded-card border border-(--border) bg-(--surface) p-5 shadow-lg"
        >
          <div class="mb-4 flex items-center justify-between gap-2">
            <h2
              :id="titleId"
              class="font-display text-base text-(--text-primary)"
            >
              {{ t("reader.prefs.title") }}
            </h2>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-button text-(--text-muted) hover:bg-(--surface-raised) focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
              :aria-label="t('reader.prefs.close')"
              @click="close"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-4 w-4"
                aria-hidden="true"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
          </div>

          <div class="flex flex-col gap-4">
            <div>
              <h3
                class="mb-1.5 font-display text-xs tracking-wide text-(--text-muted) uppercase"
              >
                {{ t("reader.prefs.fontSize.label") }}
              </h3>
              <UiSegmentedControl
                :ariaLabel="t('reader.prefs.fontSize.label')"
                :model-value="fontSizeValue"
                :options="fontSizeOptions"
                @update:model-value="onFontSizeChange"
              />
            </div>

            <div>
              <h3
                class="mb-1.5 font-display text-xs tracking-wide text-(--text-muted) uppercase"
              >
                {{ t("reader.prefs.theme.label") }}
              </h3>
              <UiSegmentedControl
                :ariaLabel="t('reader.prefs.theme.label')"
                :model-value="themeValue"
                :options="themeOptions"
                @update:model-value="onThemeChange"
              />
            </div>

            <div>
              <h3
                class="mb-1.5 font-display text-xs tracking-wide text-(--text-muted) uppercase"
              >
                {{ t("reader.prefs.language.label") }}
              </h3>
              <nav
                :aria-label="t('reader.prefs.language.label')"
                class="flex flex-wrap gap-1"
              >
                <NuxtLink
                  v-for="entry in availableLocales"
                  :key="entry.code"
                  :to="switchLocalePath(entry.code)"
                  class="rounded-button border border-(--border) px-2.5 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
                  :class="
                    entry.code === locale
                      ? 'bg-teal text-surface-white'
                      : 'text-(--text-primary) hover:bg-(--surface-raised)'
                  "
                  :aria-current="entry.code === locale ? 'true' : undefined"
                  :hreflang="entry.language"
                  @click="close"
                >
                  {{ entry.name }}
                </NuxtLink>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
