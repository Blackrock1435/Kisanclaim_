import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGS } from "../i18n";
import { api, getToken } from "../lib/api";

export default function LangSwitch() {
  const { i18n } = useTranslation();
  return (
    <label className="flex items-center gap-1 text-sm text-navy/80">
      <Languages className="h-4 w-4" aria-hidden /><span className="sr-only">Language</span>
      <select value={i18n.language} className="rounded-lg border border-sage-200 bg-white py-2 pl-2 pr-6 text-sm"
        onChange={(e) => { i18n.changeLanguage(e.target.value); if (getToken()) api(`/auth/me/language?lang=${e.target.value}`, { method: "PATCH" }).catch(() => {}); }}>
        {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}
