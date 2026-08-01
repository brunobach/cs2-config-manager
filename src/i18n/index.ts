import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";

/**
 * i18n setup — pt-BR default, English fallback.
 *
 * Translation key pattern: `<screen>.<section>.<item>`
 * (e.g. `accounts.empty.title`, `detail.tabs.binds`, `transfer.warning`).
 * - `common.*`  — shared vocabulary (save/cancel/loading/...)
 * - `errors.*`  — backend error codes from src-tauri (see src/lib/errors.ts)
 * - `shell.*`   — app shell (sidebar, nav, theme/language switchers)
 * Screens: `accounts`, `steamPath`, `transfer`, `compare`, `detail`,
 * `crosshair`, `binds`, `convars`, `files`, `backups`.
 */
export const SUPPORTED_LANGUAGES = [
  { code: "pt-BR", label: "Português (BR)" },
  { code: "en", label: "English" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const STORAGE_KEY = "cs2cm-lang";

function isLanguageCode(value: unknown): value is LanguageCode {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === value);
}

/** Persisted choice → browser language (pt* → pt-BR) → en. */
function detectInitialLanguage(): LanguageCode {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLanguageCode(stored)) return stored;
  return navigator.language.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    "pt-BR": { translation: ptBR },
    en: { translation: en },
  },
  lng: detectInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    // React already escapes interpolated values.
    escapeValue: false,
  },
});

/** Switches the active language and persists the choice. */
export function setLanguage(code: LanguageCode) {
  window.localStorage.setItem(STORAGE_KEY, code);
  void i18n.changeLanguage(code);
}

export default i18n;
