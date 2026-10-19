export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("app:suspense:resolve", () => {
    document.documentElement.dataset.readtesHydrated = "true";
  });
});
