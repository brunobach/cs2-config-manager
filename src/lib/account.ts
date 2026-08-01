import i18n from "@/i18n";

/** Minimal shape for displaying an account name — satisfied by SteamAccountSummary and AccountBrief. */
export interface AccountNameLike {
  accountId: string;
  personaName: string | null;
  accountName: string | null;
}

export function accountDisplayName(account: AccountNameLike): string {
  return account.personaName ?? i18n.t("common.accountFallback", { id: account.accountId });
}

export function accountInitials(account: AccountNameLike): string {
  const name = account.personaName ?? account.accountName ?? "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
