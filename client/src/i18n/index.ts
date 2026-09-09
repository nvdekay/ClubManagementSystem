import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import { common } from "./common";
import { demo } from "./demo";
import { users } from "./users";

export type Locale = "en" | "vi";

// New module: create i18n/<module>.ts (same en/vi shape), then add it to both locales here.
export const resources = {
  en: { translation: { common: common.en, users: users.en, demo: demo.en } },
  vi: { translation: { common: common.vi, users: users.vi, demo: demo.vi } },
};

const stored = localStorage.getItem("locale");

void i18next.use(initReactI18next).init({
  resources,
  lng: stored === "vi" ? "vi" : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false }, // React already escapes rendered strings
});

i18next.on("languageChanged", (lng) => localStorage.setItem("locale", lng));

export default i18next;
