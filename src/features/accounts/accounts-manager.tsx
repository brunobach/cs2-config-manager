import { useCallback, useEffect, useState } from "react";

import { GitCompareArrows, TriangleAlert, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { createBackup, getSteamPathInfo, listAccounts } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { SteamAccountSummary, SteamPathInfo } from "@/lib/types";

import { AccountCard } from "./account-card";
import { CompareDialog } from "./compare-dialog";
import { SteamPathCard } from "./steam-path-card";
import { SteamPathDialog } from "./steam-path-dialog";
import { TransferDialog } from "./transfer-dialog";

export function AccountsManager() {
  const { t } = useTranslation();
  const [pathInfo, setPathInfo] = useState<SteamPathInfo | null>(null);
  const [accounts, setAccounts] = useState<SteamAccountSummary[] | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [pathDialogOpen, setPathDialogOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    const pathPromise = getSteamPathInfo()
      .then((info) => setPathInfo(info))
      .catch(() => {
        // steam-path não deve falhar; mantém o estado anterior se acontecer
      });

    const accountsPromise = listAccounts()
      .then((data) => {
        setAccounts(data);
        setAccountsError(null);
      })
      .catch((err: unknown) => {
        setAccounts([]);
        setAccountsError(errorMessage(err, t));
      });

    await Promise.all([pathPromise, accountsPromise]);
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleBackup(account: SteamAccountSummary) {
    try {
      await createBackup(account.accountId);
      toast.success(t("backups.created"));
    } catch (err) {
      toast.error(errorMessage(err, t));
    }
  }

  function openTransfer(account: SteamAccountSummary) {
    setTransferFromId(account.accountId);
    setTransferOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <SteamPathCard info={pathInfo} onChangePath={() => setPathDialogOpen(true)} />

      {accounts === null ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-48 w-full" />
          ))}
        </div>
      ) : accountsError !== null ? (
        <Empty className="min-h-96 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TriangleAlert />
            </EmptyMedia>
            <EmptyTitle>{t("common.steamNotDetected")}</EmptyTitle>
            <EmptyDescription>{accountsError}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setPathDialogOpen(true)}>{t("accounts.configureSteamPath")}</Button>
          </EmptyContent>
        </Empty>
      ) : accounts.length === 0 ? (
        <Empty className="min-h-96 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>{t("accounts.empty.title")}</EmptyTitle>
            <EmptyDescription>{t("accounts.empty.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setCompareOpen(true)} disabled={accounts.length < 2}>
              <GitCompareArrows data-icon="inline-start" />
              {t("accounts.compareButton")}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {accounts.map((account, index) => (
              <AccountCard
                key={account.accountId}
                account={account}
                index={index}
                onBackup={handleBackup}
                onTransfer={openTransfer}
              />
            ))}
          </div>
        </>
      )}

      <SteamPathDialog info={pathInfo} open={pathDialogOpen} onOpenChange={setPathDialogOpen} onSaved={refresh} />
      <CompareDialog accounts={accounts ?? []} open={compareOpen} onOpenChange={setCompareOpen} />
      <TransferDialog
        accounts={accounts ?? []}
        defaultFromId={transferFromId}
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />
    </div>
  );
}
