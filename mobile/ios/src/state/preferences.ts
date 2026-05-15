import * as SecureStore from "expo-secure-store";
import { normalizeLocale, type Locale } from "@/i18n/i18n";
import type { ThemeId } from "@/theme/theme";

const THEME_KEY = "between.mobile.themeId";
const LOCALE_KEY = "between.mobile.locale";
const themeIds: ThemeId[] = ["default", "warm", "sage", "night"];

export async function loadPreferences() {
  const [themeId, locale] = await Promise.all([
    SecureStore.getItemAsync(THEME_KEY),
    SecureStore.getItemAsync(LOCALE_KEY)
  ]);
  return {
    themeId: themeIds.includes(themeId as ThemeId) ? (themeId as ThemeId) : "default",
    locale: locale ? normalizeLocale(locale) : null
  };
}

export async function saveThemeId(themeId: ThemeId) {
  await SecureStore.setItemAsync(THEME_KEY, themeId);
}

export async function saveLocale(locale: Locale) {
  await SecureStore.setItemAsync(LOCALE_KEY, locale);
}
