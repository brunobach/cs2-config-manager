import { useTranslation } from "react-i18next";

import { AccountsManager } from "./accounts-manager";

export function AccountsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">{t("accounts.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("accounts.description")}</p>
      </div>
      <AccountsManager />
    </div>
  );
}
