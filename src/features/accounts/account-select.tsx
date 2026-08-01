import { useTranslation } from "react-i18next";

import { AccountAvatar } from "@/components/layout/account-avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { accountDisplayName } from "@/lib/account";
import type { SteamAccountSummary } from "@/lib/types";

interface AccountSelectProps {
  id?: string;
  accounts: SteamAccountSummary[];
  value: string;
  onChange: (accountId: string) => void;
  excludeId?: string;
  placeholder?: string;
}

export function AccountSelect({ id, accounts, value, onChange, excludeId, placeholder }: AccountSelectProps) {
  const { t } = useTranslation();
  const options = accounts.filter((account) => account.accountId !== excludeId);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={placeholder ?? t("common.selectAccount")} />
      </SelectTrigger>
      <SelectContent>
        {options.map((account) => (
          <SelectItem key={account.accountId} value={account.accountId}>
            <AccountAvatar
              accountId={account.accountId}
              steamId64={account.steamId64}
              hasLocalAvatar={account.hasLocalAvatar}
              className="size-6"
              fallbackLabel={account.personaName ?? account.accountName ?? undefined}
            />
            <span className="truncate">{accountDisplayName(account)}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
