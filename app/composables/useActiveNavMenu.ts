/**
 * Which of the navbar's two floating menus is open, if any. Opening one
 * closes the other: the language menu (`AppLanguageSwitcher`) and the mobile
 * nav (`AppNavBar`) used to stack on top of each other on a phone.
 */
export type NavMenuName = "language" | "mobile";

export const useActiveNavMenu = () =>
  useState<NavMenuName | null>("tes-active-nav-menu", () => null);
