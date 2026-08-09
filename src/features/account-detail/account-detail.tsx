import { useCallback, useEffect, useState } from "react";

import { Archive, ArrowLeft, ArrowLeftRight, FolderOpen, TriangleAlert, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { AccountAvatar } from "@/components/layout/account-avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountBadges } from "@/features/accounts/account-badges";
import { TransferDialog } from "@/features/accounts/transfer-dialog";
import { accountDisplayName } from "@/lib/account";
import { createBackup, getAccountConfig, getSteamPathInfo, listAccounts, openCfgFolder } from "@/lib/api";
import { errorMessage, toApiError } from "@/lib/errors";
import type { AccountConfig, SteamAccountSummary, SteamPathInfo } from "@/lib/types";

import { BackupsTab } from "./backups-tab";
import { BindsTab } from "./binds-tab";
import { ConvarsTab } from "./convars-tab";
import { EditTab } from "./edit-tab";
import { FilesTab } from "./files-tab";
import { OverviewTab } from "./overview-tab";
import { ScreenshotsTab } from "./screenshots-tab";

interface AccountDetailProps {
  accountId: string;
}

interface DetailData {
  account: SteamAccountSummary;
  config: AccountConfig;
}

export function AccountDetail({ accountId }: AccountDetailProps) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pathInfo, setPathInfo] = useState<SteamPathInfo | null>(null);
  const [accounts, setAccounts] = useState<SteamAccountSummary[]>([]);
  const [transferOpen, setTransferOpen] = useState(false);
  const [backupsVersion, setBackupsVersion] = useState(0);

  const refreshConfig = useCallback(async () => {
    try {
      const data = await getAccountConfig(accountId);
      setDetail(data);
      setLoadError(null);
      setNotFound(false);
    } catch (err) {
      if (toApiError(err).code === "account_not_found") {
        setNotFound(true);
      }
      setLoadError(errorMessage(err, t));
    }
  }, [accountId, t]);

  useEffect(() => {
    void refreshConfig();
    getSteamPathInfo()
      .then((info) => setPathInfo(info))
      .catch(() => {});
    listAccounts()
      .then((data) => setAccounts(data))
      .catch(() => {});
  }, [refreshConfig]);

  async function handleBackup() {
    try {
      await createBackup(accountId);
      toast.success(t("backups.created"));
      setBackupsVersion((v) => v + 1);
    } catch (err) {
      toast.error(errorMessage(err, t));
    }
  }

  async function handleOpenFolder() {
    try {
      await openCfgFolder(accountId);
    } catch (err) {
      toast.error(errorMessage(err, t));
    }
  }

  if (notFound || (loadError !== null && detail === null)) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <User />
          </EmptyMedia>
          <EmptyTitle>{notFound ? t("detail.notFound.title") : t("detail.loadError.title")}</EmptyTitle>
          <EmptyDescription>{loadError}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft data-icon="inline-start" />
              {t("common.backToAccounts")}
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (detail === null) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const { account, config } = detail;
  const name = accountDisplayName(account);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft data-icon="inline-start" />
            {t("common.back")}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <AccountAvatar
            accountId={account.accountId}
            steamId64={account.steamId64}
            hasLocalAvatar={account.hasLocalAvatar}
            className="size-14"
            fallbackLabel={account.personaName ?? account.accountName ?? undefined}
          />
          <div className="min-w-0 space-y-1">
            <h1 className="truncate text-2xl tracking-tight">{name}</h1>
            <p className="text-sm text-muted-foreground">
              {account.accountName && <>{account.accountName} · </>}
              <span className="font-mono text-xs">{account.steamId64}</span>
            </p>
            <AccountBadges account={account} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleOpenFolder}>
            <FolderOpen data-icon="inline-start" />
            {t("accounts.card.openFolder")}
          </Button>
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight data-icon="inline-start" />
            {t("transfer.action")}
          </Button>
          <Button variant="outline" onClick={handleBackup}>
            <Archive data-icon="inline-start" />
            {t("backups.create")}
          </Button>
        </div>
      </div>

      {(pathInfo?.steamRunning || pathInfo?.cs2Running) && (
        <Alert className="border-amber-500/50 text-amber-700 dark:text-amber-400">
          <TriangleAlert />
          <AlertTitle>{t("detail.runningWarning.title")}</AlertTitle>
          <AlertDescription className="text-amber-700/80 dark:text-amber-400/80">
            {t("detail.runningWarning.description")}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="visao-geral">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="visao-geral">{t("detail.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="editar">{t("detail.tabs.edit")}</TabsTrigger>
          <TabsTrigger value="binds">{t("detail.tabs.binds")}</TabsTrigger>
          <TabsTrigger value="convars">{t("detail.tabs.convars")}</TabsTrigger>
          <TabsTrigger value="arquivos">{t("detail.tabs.files")}</TabsTrigger>
          <TabsTrigger value="backups">{t("detail.tabs.backups")}</TabsTrigger>
          <TabsTrigger value="screenshots">{t("detail.tabs.screenshots")}</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="mt-4">
          <OverviewTab config={config} />
        </TabsContent>
        <TabsContent value="editar" className="mt-4">
          <EditTab
            key={`edit-${config.raw.convars ?? ""}-${config.raw.video ?? ""}`}
            accountId={accountId}
            config={config}
            onSaved={refreshConfig}
          />
        </TabsContent>
        <TabsContent value="binds" className="mt-4">
          <BindsTab
            key={`binds-${config.raw.binds ?? "none"}`}
            accountId={accountId}
            binds={config.binds}
            onSaved={refreshConfig}
          />
        </TabsContent>
        <TabsContent value="convars" className="mt-4">
          <ConvarsTab
            key={`convars-${config.raw.convars ?? "none"}-${config.raw.machine ?? "none"}`}
            accountId={accountId}
            convars={config.convars}
            machineConvars={config.machineConvars}
            onSaved={refreshConfig}
          />
        </TabsContent>
        <TabsContent value="arquivos" className="mt-4">
          <FilesTab accountId={accountId} config={config} onSaved={refreshConfig} />
        </TabsContent>
        <TabsContent value="backups" className="mt-4">
          <BackupsTab accountId={accountId} version={backupsVersion} onRestored={refreshConfig} />
        </TabsContent>
        <TabsContent value="screenshots" className="mt-4">
          <ScreenshotsTab accountId={accountId} />
        </TabsContent>
      </Tabs>

      <TransferDialog
        accounts={accounts}
        defaultFromId={accountId}
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onDone={refreshConfig}
      />
    </div>
  );
}
