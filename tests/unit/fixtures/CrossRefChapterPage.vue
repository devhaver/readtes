<script setup lang="ts">
// Stands in for the reader page (`app/pages/read/[part]/[chapter].vue`) in
// `reader-source-segment.spec.ts`: all `ReaderSourceSegment` needs from it
// is the chapter list of the part currently open.
//
// The top-level `await` is the point of this file, not scaffolding. The
// real page calls `provideCrossRefChapters` *after* two awaited content
// loads, which only works because `<script setup>` restores the component
// instance across an await (`withAsyncContext`) — a plain `defineComponent`
// with an `async setup()` would silently drop the `provide` and every
// cross-reference would fall back to its external link. Mirroring the
// page's compilation path here is what makes these specs cover that.
import type { TocChapter } from "~~/shared/types/content";

const props = defineProps<{ chapters: TocChapter[] }>();

await Promise.resolve();

provideCrossRefChapters(props.chapters);
</script>

<template>
  <div><slot /></div>
</template>
