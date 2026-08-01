import { Link } from "react-router-dom";

import { motion } from "framer-motion";
import { Archive, ArrowLeftRight, Clock, EllipsisVertical, Keyboard, Monitor, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AccountAvatar } from "@/components/layout/account-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { accountDisplayName } from "@/lib/account";
import { formatRelativeDate } from "@/lib/format";
import type { SteamAccountSummary } from "@/lib/types";

import { AccountBadges } from "./account-badges";

/** O backend envia displayMode em pt-BR; mapeia para as chaves i18n com fallback no valor bruto. */
const DISPLAY_MODE_KEYS: Record<string, string> = {
  "Tela cheia": "accounts.displayMode.fullscreen",
  "Janela sem borda": "accounts.displayMode.borderless",
  Janela: "accounts.displayMode.windowed",
};

interface AccountCardProps {
  account: SteamAccountSummary;
  index: number;
  onBackup: (account: SteamAccountSummary) => void;
  onTransfer: (account: SteamAccountSummary) => void;
}

export function AccountCard({ account, index, onBackup, onTransfer }: AccountCardProps) {
  const { t } = useTranslation();
  const name = accountDisplayName(account);
  const displayMode = account.displayMode ? (DISPLAY_MODE_KEYS[account.displayMode] ?? null) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.05, 0.4) }}
    >
      <Card className="h-full transition-colors hover:border-primary/40">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div className="flex min-w-0 items-center gap-3">
            <AccountAvatar
              accountId={account.accountId}
              steamId64={account.steamId64}
              hasLocalAvatar={account.hasLocalAvatar}
              className="size-10"
              fallbackLabel={account.personaName ?? account.accountName ?? undefined}
            />
            <div className="min-w-0 space-y-0.5">
              <CardTitle className="truncate text-base">{name}</CardTitle>
              {account.accountName && <p className="truncate text-xs text-muted-foreground">{account.accountName}</p>}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t("accounts.card.actions")}>
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onBackup(account)}>
                <Archive />
                {t("backups.create")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTransfer(account)}>
                <ArrowLeftRight />
                {t("transfer.actionTo")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <AccountBadges account={account} />
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Monitor className="size-3.5 shrink-0" />
              <span className="truncate">
                {account.resolution ?? "—"}
                {displayMode ? ` · ${t(displayMode)}` : (account.displayMode ? ` · ${account.displayMode}` : "")}
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Keyboard className="size-3.5 shrink-0" />
              {t("accounts.card.binds", { count: account.bindCount })}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Settings2 className="size-3.5 shrink-0" />
              {t("accounts.card.convars", { count: account.convarCount })}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-3.5 shrink-0" />
              <span className="truncate">{account.lastModified ? formatRelativeDate(account.lastModified) : "—"}</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 border-t pt-3">
            <span className="truncate font-mono text-xs text-muted-foreground">{account.steamId64}</span>
            <Button size="sm" asChild>
              <Link to={`/account/${account.accountId}`}>{t("accounts.card.open")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
