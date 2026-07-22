<script setup lang="ts">
// Dev-only token demo — proves design tokens, fonts, and dark mode work.
// Not linked from anywhere and excluded from prerender (see nuxt.config.ts
// routeRules) — never ships in the generated static site.

const colorSwatches = [
  { name: "navy-primary", class: "bg-navy-primary" },
  { name: "teal", class: "bg-teal" },
  { name: "orange-cta", class: "bg-orange-cta" },
  { name: "green-progress", class: "bg-green-progress" },
  {
    name: "surface-white",
    class: "bg-surface-white border border-border-subtle",
  },
  {
    name: "surface-light",
    class: "bg-surface-light border border-border-subtle",
  },
  {
    name: "surface-warm",
    class: "bg-surface-warm border border-border-subtle",
  },
  { name: "heading", class: "bg-heading" },
  { name: "body", class: "bg-body" },
  { name: "muted", class: "bg-muted" },
  { name: "border-subtle", class: "bg-border-subtle" },
  { name: "border-emphasis", class: "bg-border-emphasis" },
  { name: "error", class: "bg-error" },
] as const;

const radii = [
  { name: "radius-card", class: "rounded-card" },
  { name: "radius-button", class: "rounded-button" },
  { name: "radius-input", class: "rounded-input" },
] as const;
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-10 px-6 py-10">
    <h1 class="font-display text-2xl text-(--text-primary)">
      Design token demo
    </h1>

    <section>
      <h2 class="font-display text-xl text-(--text-primary)">Colours</h2>
      <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div
          v-for="swatch in colorSwatches"
          :key="swatch.name"
          class="flex flex-col items-start gap-2"
        >
          <div class="h-16 w-full rounded-card" :class="swatch.class" />
          <span class="text-sm text-(--text-muted)">{{ swatch.name }}</span>
        </div>
      </div>
    </section>

    <section>
      <h2 class="font-display text-xl text-(--text-primary)">Type</h2>
      <div class="mt-4 space-y-3">
        <p class="font-body text-lg">
          Body / Inter — The quick brown fox jumps over the lazy dog.
        </p>
        <p class="font-display text-lg">
          Display / Taviraj — The quick brown fox jumps over the lazy dog.
        </p>
        <p dir="rtl" lang="he" class="font-hebrew text-lg">
          הקדמה לתלמוד עשר הספירות
        </p>
      </div>
    </section>

    <section>
      <h2 class="font-display text-xl text-(--text-primary)">Radii</h2>
      <div class="mt-4 flex gap-6">
        <div
          v-for="radius in radii"
          :key="radius.name"
          class="flex flex-col items-center gap-2"
        >
          <div
            class="h-16 w-16 border-2 border-border-emphasis bg-(--surface-raised)"
            :class="radius.class"
          />
          <span class="text-sm text-(--text-muted)">{{ radius.name }}</span>
        </div>
      </div>
    </section>

    <section>
      <h2 class="font-display text-xl text-(--text-primary)">
        Semantic surfaces
      </h2>
      <div class="mt-4 space-y-3">
        <div class="rounded-card border border-(--border) bg-(--surface) p-4">
          --surface
        </div>
        <div
          class="rounded-card border border-(--border) bg-(--surface-raised) p-4"
        >
          --surface-raised
        </div>
        <p class="text-(--text-primary)">--text-primary</p>
        <p class="text-(--text-muted)">--text-muted</p>
      </div>
    </section>
  </div>
</template>
