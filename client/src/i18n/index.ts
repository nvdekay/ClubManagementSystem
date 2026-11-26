import i18next, { type BackendModule, type ResourceKey } from 'i18next'
import { initReactI18next } from 'react-i18next'

export type Locale = 'en' | 'vi'

// Each locale is its own chunk: the first load fetches only the active one, the other is fetched
// on the first switch. New module: add locales/en/<module>.ts and locales/vi/<module>.ts, then
// register it in both locales/<locale>/index.ts.
function loadLocale(locale: Locale): Promise<ResourceKey> {
  return locale === 'vi'
    ? import('./locales/vi/index').then((module) => module.vi.translation)
    : import('./locales/en/index').then((module) => module.en.translation)
}

const localeBackend: BackendModule = {
  type: 'backend',
  init() {},
  read(language, _namespace, callback) {
    loadLocale(language === 'vi' ? 'vi' : 'en').then(
      (translation) => callback(null, translation),
      (error: unknown) => callback(error instanceof Error ? error : String(error), null),
    )
  },
}

const stored = localStorage.getItem('locale')

/**
 * Resolves once the active locale is loaded; render after it so no raw key is ever shown.
 * `changeLanguage` loads the other locale before switching, so the UI never flashes raw keys.
 * There is no fallback language: `satisfies Messages<…>` already makes every locale complete,
 * and a fallback would download both locales on every visit.
 */
export const i18nReady = i18next
  .use(localeBackend)
  .use(initReactI18next)
  .init({
    lng: stored === 'vi' ? 'vi' : 'en',
    supportedLngs: ['en', 'vi'],
    fallbackLng: false,
    interpolation: { escapeValue: false }, // React already escapes rendered strings
  })

i18next.on('languageChanged', (lng) => localStorage.setItem('locale', lng))

export default i18next
