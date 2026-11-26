import type { en } from './locales/en/index'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: typeof en
  }
}
