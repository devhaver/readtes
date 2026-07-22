<script setup lang="ts">
const { t } = useI18n();
const localePath = useLocalePath();

const mobileMenuOpen = ref(false);

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};

const closeMobileMenu = () => {
  mobileMenuOpen.value = false;
};
</script>

<template>
  <header class="bg-navy-primary text-surface-white">
    <div
      class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
    >
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-button hover:bg-surface-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal sm:hidden"
          :aria-label="mobileMenuOpen ? t('nav.menuClose') : t('nav.menuOpen')"
          aria-controls="mobile-nav"
          :aria-expanded="mobileMenuOpen"
          @click="toggleMobileMenu"
        >
          <svg
            v-if="!mobileMenuOpen"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            class="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M6 6 18 18M18 6 6 18" />
          </svg>
        </button>

        <NuxtLink
          :to="localePath('/')"
          class="flex items-baseline gap-2 rounded-button focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
          @click="closeMobileMenu"
        >
          <span class="font-display text-xl tracking-wide">{{
            t("common.siteName")
          }}</span>
          <span class="hidden text-xs text-surface-white/70 sm:inline">{{
            t("common.brandSubline")
          }}</span>
        </NuxtLink>
      </div>

      <nav
        :aria-label="t('nav.primary')"
        class="hidden items-center gap-6 sm:flex"
      >
        <NuxtLink
          :to="localePath('/volumes')"
          class="text-sm hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
        >
          {{ t("nav.volumesLink") }}
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-3">
        <AppLanguageSwitcher />
        <AppThemeToggle />
      </div>
    </div>

    <div
      v-if="mobileMenuOpen"
      id="mobile-nav"
      class="border-t border-surface-white/10 px-4 py-3 sm:hidden"
    >
      <NuxtLink
        :to="localePath('/volumes')"
        class="block rounded-button py-2 text-sm hover:text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
        @click="closeMobileMenu"
      >
        {{ t("nav.volumesLink") }}
      </NuxtLink>
    </div>
  </header>
</template>
