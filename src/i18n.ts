import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import ru from "./locales/ru.json";
import ar from "./locales/ar.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"] },
    interpolation: { escapeValue: false },
  });

// Keep <html dir> in sync with language
i18n.on("languageChanged", (lng) => {
  document.documentElement.dir  = lng === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lng;
});

export default i18n;
