<script setup lang="ts">
// Study mode's thin reading-position rail: a fixed strip on the
// inline-end edge (`end-0` — the logical property, so it lands on the
// left in RTL rather than needing a `dir`-conditional class) that fills
// top-down as the reader scrolls through the chapter. Passive scroll/resize
// listeners, rAF-batched, and the fill itself only ever changes via a
// `transform: scaleY(...)` on a fixed-size track — no layout-affecting
// property is ever touched, so this can never cause layout thrash.
const { t } = useI18n();

const progress = ref(0);
let rafHandle: number | null = null;

const measure = () => {
  rafHandle = null;
  progress.value = computeReadingProgress({
    scrollTop: window.scrollY,
    viewportHeight: window.innerHeight,
    contentHeight: document.documentElement.scrollHeight,
  });
};

const onScrollOrResize = () => {
  if (rafHandle !== null) return;
  rafHandle = requestAnimationFrame(measure);
};

onMounted(() => {
  measure();
  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", onScrollOrResize, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("scroll", onScrollOrResize);
  window.removeEventListener("resize", onScrollOrResize);
  if (rafHandle !== null) cancelAnimationFrame(rafHandle);
});

const percent = computed(() => Math.round(progress.value * 100));
</script>

<template>
  <div
    class="pointer-events-none fixed inset-y-0 end-0 z-20 w-1"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="percent"
    :aria-label="t('reader.progressLabel')"
  >
    <div class="h-full w-full bg-(--border)">
      <div
        class="h-full w-full origin-top bg-teal"
        :style="{ transform: `scaleY(${progress})` }"
      />
    </div>
  </div>
</template>
