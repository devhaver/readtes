<script setup lang="ts">
// The reader is full-bleed, so its layout renders the navbar on the same
// gutters as the toolbar below it instead of the site's centred 5xl column.
defineProps<{ fullWidth?: boolean }>();

const { t } = useI18n();
const localePath = useLocalePath();
const route = useRoute();

// One list for both the desktop row and the mobile menu. `current` is a prefix
// match, so `/volumes/volume-1` lights "Volumes" too (the link's own active
// class only matches route records, and a volume page is a sibling record of
// the index).
const navLinks = computed(() =>
  [
    { key: "volumes", path: "/volumes", label: t("nav.volumesLink") },
    { key: "glossary", path: "/glossary", label: t("nav.glossaryLink") },
    { key: "about", path: "/about", label: t("nav.aboutLink") },
  ].map((link) => {
    const to = localePath(link.path);
    return {
      ...link,
      to,
      current: route.path === to || route.path.startsWith(`${to}/`),
    };
  }),
);

const mobileMenuOpen = ref(false);
const activeMenu = useActiveNavMenu();
const openOverlays = useOpenOverlayCount();

const mobileNav = ref<HTMLElement | null>(null);
const menuButton = ref<HTMLElement | null>(null);

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};

const closeMobileMenu = () => {
  mobileMenuOpen.value = false;
};

// Only one floating menu at a time: opening this one closes the language
// menu, and the language menu opening (or any overlay) closes this one.
watch(mobileMenuOpen, (open) => {
  if (open) activeMenu.value = "mobile";
  else if (activeMenu.value === "mobile") activeMenu.value = null;
});
watch(activeMenu, (name) => {
  if (name !== "mobile") closeMobileMenu();
});
watch(openOverlays, (count) => {
  if (count > 0) closeMobileMenu();
});

// It used to stay open across navigation.
watch(() => route.fullPath, closeMobileMenu);

// Escape closes it and hands focus back to the button; a tap anywhere
// outside the menu and its button closes it too.
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Escape" || !mobileMenuOpen.value) return;
  closeMobileMenu();
  menuButton.value?.focus();
};
const onPointerdown = (event: PointerEvent) => {
  if (!mobileMenuOpen.value) return;
  const target = event.target as Node;
  if (mobileNav.value?.contains(target) || menuButton.value?.contains(target)) {
    return;
  }
  closeMobileMenu();
};
onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("pointerdown", onPointerdown);
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("pointerdown", onPointerdown);
});
</script>

<template>
  <header class="relative bg-navy-primary text-surface-white">
    <div
      class="flex items-center justify-between gap-4 py-3"
      :class="fullWidth ? 'px-3 sm:px-5' : 'mx-auto max-w-5xl px-4 sm:px-6'"
    >
      <div class="flex items-center gap-3">
        <button
          ref="menuButton"
          type="button"
          class="tes-focus-ring tes-focus-ring-inverse tes-touch-target inline-flex h-9 w-9 items-center justify-center rounded-button hover:bg-surface-white/10 sm:hidden"
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
          class="tes-focus-ring tes-focus-ring-inverse flex items-baseline gap-2 whitespace-nowrap rounded-button"
          @click="closeMobileMenu"
        >
          <span class="font-display text-xl tracking-wide">{{
            t("common.siteName")
          }}</span>
          <span class="hidden text-xs text-surface-white/70 lg:inline">{{
            t("common.brandSubline")
          }}</span>
        </NuxtLink>
      </div>

      <nav
        :aria-label="t('nav.primary')"
        class="hidden items-center gap-6 sm:flex"
      >
        <NuxtLink
          v-for="link in navLinks"
          :key="link.key"
          :to="link.to"
          class="tes-navbar-link"
          :class="{ 'is-current': link.current }"
          :aria-current="link.current ? 'page' : undefined"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <!-- Right after the brand in the DOM (and so in the Tab order) rather
           than after the language and theme controls; it drops down over the
           page below the bar. -->
      <nav
        v-if="mobileMenuOpen"
        id="mobile-nav"
        ref="mobileNav"
        :aria-label="t('nav.primary')"
        class="absolute inset-x-0 top-full z-40 border-t border-surface-white/10 bg-navy-primary px-4 py-3 shadow-lg sm:hidden"
      >
        <NuxtLink
          v-for="link in navLinks"
          :key="link.key"
          :to="link.to"
          class="tes-navbar-link-mobile"
          :class="{ 'is-current': link.current }"
          :aria-current="link.current ? 'page' : undefined"
          @click="closeMobileMenu"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-3">
        <AppLanguageSwitcher />
        <AppThemeToggle />
      </div>
    </div>
  </header>
</template>
