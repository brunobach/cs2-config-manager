import { useTranslation } from "react-i18next";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from "@/i18n";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  return (
    <div className="space-y-1">
      <p className="px-1 text-xs text-muted-foreground">{t("shell.language")}</p>
      <Select value={i18n.language} onValueChange={(value) => setLanguage(value as LanguageCode)}>
        <SelectTrigger className="w-full" aria-label={t("shell.language")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
