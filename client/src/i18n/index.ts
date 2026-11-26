import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

import { en } from './locales/en/index'
import { vi } from './locales/vi/index'

export type Locale = 'en' | 'vi'

// New module: add locales/en/<module>.ts and locales/vi/<module>.ts, then register it in both
// locales/<locale>/index.ts.
export const resources = { en, vi }

const stored = localStorage.getItem('locale')

void i18next.use(initReactI18next).init({
  resources,
  lng: stored === 'vi' ? 'vi' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes rendered strings
})

i18next.on('languageChanged', (lng) => localStorage.setItem('locale', lng))

export default i18next
