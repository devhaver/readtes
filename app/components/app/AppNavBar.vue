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
          class="tes-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-button hover:bg-surface-white/10 sm:hidden"
          :aria-label="mobileMenuOpen ? t('nav.menuClose') : t('nav.menuOpen')"
          aria-controls="mobile-nav"
          :aria-expanded="mobileMenuOpen"
          @click="toggleMobileMenu"
        >
          <span
            class="tes-icon h-5 w-5"
            :class="
              mobileMenuOpen
                ? 'tes-icon-hamburger-close'
                : 'tes-icon-hamburger-open'
            "
            aria-hidden="true"
          />
        </button>

        <NuxtLink
          :to="localePath('/')"
          class="tes-focus-ring flex items-baseline gap-2 rounded-button"
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
        <NuxtLink :to="localePath('/volumes')" class="tes-navbar-link">
          {{ t("nav.volumesLink") }}
        </NuxtLink>
        <NuxtLink :to="localePath('/glossary')" class="tes-navbar-link">
          {{ t("nav.glossaryLink") }}
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
        class="tes-navbar-link-mobile"
        @click="closeMobileMenu"
      >
        {{ t("nav.volumesLink") }}
      </NuxtLink>
      <NuxtLink
        :to="localePath('/glossary')"
        class="tes-navbar-link-mobile"
        @click="closeMobileMenu"
      >
        {{ t("nav.glossaryLink") }}
      </NuxtLink>
    </div>
  </header>
</template>
