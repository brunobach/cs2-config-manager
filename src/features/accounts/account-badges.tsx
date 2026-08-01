import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import type { SteamAccountSummary } from "@/lib/types";

export function AccountBadges({ account }: { account: SteamAccountSummary }) {
  const { t } = useTranslation();

  if (!account.isMostRecent && !account.isAutoLogin && account.hasLocalProfile) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {account.isMostRecent && <Badge variant="secondary">{t("accounts.badges.recentLogin")}</Badge>}
      {account.isAutoLogin && <Badge variant="outline">{t("accounts.badges.autoLogin")}</Badge>}
      {!account.hasLocalProfile && <Badge variant="outline">{t("accounts.badges.noLocalProfile")}</Badge>}
    </div>
  );
}
