import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import kn from "./kn.json";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, kn: { translation: kn } },
  lng: localStorage.getItem("kc_lang") || "en", fallbackLng: "en", interpolation: { escapeValue: false },
});
i18n.on("languageChanged", (l) => localStorage.setItem("kc_lang", l));
export const LANGS = [{ code: "en", label: "English" }, { code: "kn", label: "ಕನ್ನಡ (Kannada)" }];
export default i18n;

