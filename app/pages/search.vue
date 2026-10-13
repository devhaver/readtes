<script setup lang="ts">
interface SearchResultAttributes {
  chapterTitle: string;
  excerpt: string;
  language: string;
  layer: "source" | "commentary" | "summary";
  partTitle: string;
  versionTitle: string;
}

interface SearchResultResource {
  type: "search-result";
  id: string;
  attributes: SearchResultAttributes;
  links: { reader: string };
}

interface SearchResponse {
  data: SearchResultResource[];
  meta: { count: number; query: string };
}

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const localePath = useLocalePath();

const initialQuery = Array.isArray(route.query.q)
  ? route.query.q[0]
  : route.query.q;
const query = ref(initialQuery ?? "");
const submittedQuery = ref("");
const results = ref<SearchResultResource[]>([]);
const pending = ref(false);
const failed = ref(false);

const layerLabel = (layer: SearchResultAttributes["layer"]): string =>
  t(`search.layers.${layer}`);

const search = async () => {
  const normalizedQuery = query.value.trim();
  if (normalizedQuery.length < 2) return;

  pending.value = true;
  failed.value = false;
  submittedQuery.value = normalizedQuery;
  void router.replace({ query: { q: normalizedQuery } });

  try {
    const response = await $fetch<SearchResponse>("/api/search", {
      query: { q: normalizedQuery, lang: locale.value },
    });
    results.value = response.data;
  } catch {
    results.value = [];
    failed.value = true;
  } finally {
    pending.value = false;
  }
};

onMounted(() => {
  if (query.value.trim().length >= 2) void search();
});

useLocalizedSeo({
  title: () => t("search.title"),
  description: () => t("search.description"),
});
</script>

<template>
  <main class="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
    <header class="max-w-2xl">
      <h1 class="font-display text-3xl text-(--text-primary) sm:text-4xl">
        {{ t("search.title") }}
      </h1>
      <p class="mt-3 text-lg text-(--text-muted)">
        {{ t("search.description") }}
      </p>
    </header>

    <form
      class="mt-8 flex max-w-2xl gap-3"
      role="search"
      @submit.prevent="search"
    >
      <label class="min-w-0 flex-1">
        <span class="sr-only">{{ t("search.label") }}</span>
        <input
          v-model="query"
          type="search"
          name="q"
          minlength="2"
          maxlength="200"
          required
          :placeholder="t('search.placeholder')"
          class="tes-focus-ring h-12 w-full rounded-button border border-(--border) bg-(--surface) px-4 text-(--text-primary) placeholder:text-(--text-muted)"
        />
      </label>
      <button
        type="submit"
        class="tes-focus-ring h-12 rounded-button bg-navy-primary px-5 font-semibold text-surface-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        :disabled="pending"
      >
        {{ pending ? t("search.searching") : t("search.submit") }}
      </button>
    </form>

    <p class="mt-4 text-sm text-(--text-muted)" aria-live="polite">
      <template v-if="failed">{{ t("search.error") }}</template>
      <template v-else-if="pending">{{ t("search.searching") }}</template>
      <template v-else-if="submittedQuery && results.length">
        {{ t("search.resultCount", { count: results.length }) }}
      </template>
      <template v-else-if="submittedQuery">{{
        t("search.noResults")
      }}</template>
      <template v-else>{{ t("search.hint") }}</template>
    </p>

    <ol v-if="results.length" class="mt-8 space-y-4">
      <li
        v-for="result in results"
        :key="result.id"
        class="rounded-card border border-(--border) bg-(--surface) p-5"
      >
        <NuxtLink
          :to="result.links.reader"
          class="tes-focus-ring rounded-button font-display text-xl text-(--text-primary) hover:text-(--accent-text)"
        >
          {{ result.attributes.chapterTitle }}
        </NuxtLink>
        <p class="mt-1 text-sm text-(--text-muted)">
          {{ result.attributes.partTitle }} ·
          {{ layerLabel(result.attributes.layer) }} ·
          {{ result.attributes.versionTitle }}
        </p>
        <p class="mt-3 max-w-prose text-(--text-primary)">
          {{ result.attributes.excerpt }}
        </p>
      </li>
    </ol>

    <NuxtLink
      v-if="submittedQuery && !pending && !results.length"
      :to="localePath('/glossary')"
      class="tes-focus-ring mt-6 inline-block rounded-button text-(--accent-text) underline underline-offset-2"
    >
      {{ t("search.browseGlossary") }}
    </NuxtLink>
  </main>
</template>
