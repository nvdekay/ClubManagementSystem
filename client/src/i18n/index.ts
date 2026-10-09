import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import { common } from "./common";
import { auth } from "./auth";
import { demo } from "./demo";
import { discovery } from "./discovery";
import { policy } from "./policy";
import { applications } from "./applications";
import { reviews } from "./reviews";
import { clubSettings } from "./clubSettings";
import { boardNominations } from "./boardNominations";
import { recruitmentCampaigns } from "./recruitmentCampaigns";
import { recruitmentApplications } from "./recruitmentApplications";
import { users } from "./users";
import { dashboard } from "./dashboard";
import { leadershipTransitions } from "./leadershipTransitions";
import { eventRegistrations } from "./eventRegistrations";
import { eventFeedback } from "./eventFeedback";
import { studentFeedback } from "./studentFeedback";
import { memberSpace } from "./memberSpace";
import { clubFields } from "./clubFields";
import { properties } from "./properties";
import { evaluationSchemes } from "./evaluationSchemes";
import { exports } from "./exports";

export type Locale = "en" | "vi";

// New module: create i18n/<module>.ts (same en/vi shape), then add it to both locales here.
export const resources = {
  en: { translation: { common: common.en, auth: auth.en, discovery: discovery.en,
    policy: policy.en, applications: applications.en, reviews: reviews.en,
    clubSettings: clubSettings.en, boardNominations: boardNominations.en,
    recruitmentCampaigns: recruitmentCampaigns.en, recruitmentApplications: recruitmentApplications.en,
    users: users.en, dashboard: dashboard.en, leadershipTransitions: leadershipTransitions.en,
    eventRegistrations: eventRegistrations.en, eventFeedback: eventFeedback.en,
    studentFeedback: studentFeedback.en, memberSpace: memberSpace.en, clubFields: clubFields.en, properties: properties.en, evaluationSchemes: evaluationSchemes.en, exports: exports.en,
    demo: demo.en } },
  vi: { translation: { common: common.vi, auth: auth.vi, discovery: discovery.vi,
    policy: policy.vi, applications: applications.vi, reviews: reviews.vi,
    clubSettings: clubSettings.vi, boardNominations: boardNominations.vi,
    recruitmentCampaigns: recruitmentCampaigns.vi, recruitmentApplications: recruitmentApplications.vi,
    users: users.vi, dashboard: dashboard.vi, leadershipTransitions: leadershipTransitions.vi,
    eventRegistrations: eventRegistrations.vi, eventFeedback: eventFeedback.vi,
    studentFeedback: studentFeedback.vi, memberSpace: memberSpace.vi, clubFields: clubFields.vi, properties: properties.vi, evaluationSchemes: evaluationSchemes.vi, exports: exports.vi,
    demo: demo.vi } },
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
