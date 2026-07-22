<script setup lang="ts">
export interface BreadcrumbItem {
  label: string;
  /** Omitted for the current (last) item, which renders as plain text. */
  to?: string;
}

defineProps<{ items: BreadcrumbItem[] }>();

const { t } = useI18n();
</script>

<template>
  <nav :aria-label="t('nav.breadcrumbLabel')" class="text-sm">
    <ol class="flex flex-wrap items-center gap-1.5 text-(--text-muted)">
      <li
        v-for="(item, index) in items"
        :key="item.to ?? item.label"
        class="flex items-center gap-1.5"
      >
        <NuxtLink
          v-if="item.to"
          :to="item.to"
          class="rounded-button hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
        >
          {{ item.label }}
        </NuxtLink>
        <span v-else class="text-(--text-primary)" aria-current="page">{{
          item.label
        }}</span>
        <span v-if="index < items.length - 1" aria-hidden="true">/</span>
      </li>
    </ol>
  </nav>
</template>
