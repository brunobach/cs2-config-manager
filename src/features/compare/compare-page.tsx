import { useTranslation } from "react-i18next";

import { CompareView } from "./compare-view";

export function ComparePage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">{t("compare.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("compare.description")}</p>
      </div>
      <CompareView />
    </div>
  );
}
