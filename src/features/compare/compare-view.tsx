import { useEffect, useState } from "react";

import type { TFunction } from "i18next";
import { ArrowLeft, ArrowLeftRight, GitCompareArrows } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { AccountAvatar } from "@/components/layout/account-avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccountSelect } from "@/features/accounts/account-select";
import { TransferDialog } from "@/features/accounts/transfer-dialog";
import { accountDisplayName } from "@/lib/account";
import { diffAccounts, listAccounts } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { AccountBrief, DiffEntry, DiffResult, SteamAccountSummary } from "@/lib/types";

function statusBadge(entry: DiffEntry, t: TFunction) {
  if (entry.status === "different") return <Badge variant="destructive">{t("compare.statusDifferent")}</Badge>;
  if (entry.status === "only-a") return <Badge variant="outline">{t("compare.statusOnlyA")}</Badge>;
  if (entry.status === "only-b") return <Badge variant="outline">{t("compare.statusOnlyB")}</Badge>;
  return null;
}

function BriefCard({ label, brief }: { label: string; brief: AccountBrief }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <AccountAvatar
          accountId={brief.accountId}
          steamId64={brief.steamId64}
          hasLocalAvatar={brief.hasLocalAvatar}
          fallbackLabel={brief.personaName ?? brief.accountName ?? undefined}
        />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate font-medium">{accountDisplayName(brief)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CompareView() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<SteamAccountSummary[] | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [aId, setAId] = useState(() => searchParams.get("a") ?? "");
  const [bId, setBId] = useState(() => searchParams.get("b") ?? "");
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [onlyDiffs, setOnlyDiffs] = useState(true);
  const [transferOpen, setTransferOpen] = useState(false);
  const [diffVersion, setDiffVersion] = useState(0);

  useEffect(() => {
    listAccounts()
      .then((data) => setAccounts(data))
      .catch((err: unknown) => {
        setAccounts([]);
        setAccountsError(errorMessage(err, t));
      });
  }, [t]);

  useEffect(() => {
    if (!aId || !bId || aId === bId) {
      setDiff(null);
      return;
    }
    let cancelled = false;
    setLoadingDiff(true);
    diffAccounts(aId, bId)
      .then((data) => {
        if (!cancelled) setDiff(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDiff(null);
          toast.error(errorMessage(err, t));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDiff(false);
      });
    return () => {
      cancelled = true;
    };
  }, [aId, bId, diffVersion, t]);

  function selectA(value: string) {
    setAId(value);
    if (value && bId && value !== bId) setSearchParams({ a: value, b: bId }, { replace: true });
  }

  function selectB(value: string) {
    setBId(value);
    if (aId && value && aId !== value) setSearchParams({ a: aId, b: value }, { replace: true });
  }

  if (accountsError !== null) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <GitCompareArrows />
          </EmptyMedia>
          <EmptyTitle>{t("common.steamNotDetected")}</EmptyTitle>
          <EmptyDescription>{accountsError}</EmptyDescription>
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

  if (accounts === null) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const totalDiffs = diff?.groups.reduce((sum, group) => sum + group.diffCount, 0) ?? 0;
  const readyToCompare = aId !== "" && bId !== "" && aId !== bId;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="compare-a">{t("compare.accountA")}</Label>
          <AccountSelect id="compare-a" accounts={accounts} value={aId} onChange={selectA} excludeId={bId} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="compare-b">{t("compare.accountB")}</Label>
          <AccountSelect id="compare-b" accounts={accounts} value={bId} onChange={selectB} excludeId={aId} />
        </div>
        <div className="flex items-center gap-2 pb-1.5">
          <Switch id="only-diffs" checked={onlyDiffs} onCheckedChange={setOnlyDiffs} />
          <Label htmlFor="only-diffs" className="font-normal">
            {t("compare.onlyDiffs")}
          </Label>
        </div>
        <Button variant="outline" onClick={() => setTransferOpen(true)} disabled={!readyToCompare}>
          <ArrowLeftRight data-icon="inline-start" />
          {t("compare.transferAB")}
        </Button>
      </div>

      {aId !== "" && aId === bId && (
        <Alert>
          <GitCompareArrows />
          <AlertTitle>{t("compare.sameAccount.title")}</AlertTitle>
          <AlertDescription>{t("compare.sameAccount.description")}</AlertDescription>
        </Alert>
      )}

      {!readyToCompare ? (
        <Empty className="min-h-96 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GitCompareArrows />
            </EmptyMedia>
            <EmptyTitle>{t("compare.select.title")}</EmptyTitle>
            <EmptyDescription>{t("compare.select.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : loadingDiff ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : diff === null ? null : (
        <>
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
            <BriefCard label={t("compare.accountA")} brief={diff.a} />
            <BriefCard label={t("compare.accountB")} brief={diff.b} />
          </div>

          <p className="text-sm text-muted-foreground">
            {totalDiffs === 0 ? t("compare.identical") : t("compare.summary", { count: totalDiffs })}
          </p>

          <Accordion
            key={`${aId}-${bId}-${diffVersion}`}
            type="multiple"
            defaultValue={diff.groups.filter((group) => group.diffCount > 0).map((group) => group.id)}
          >
            {diff.groups.map((group) => {
              const visibleEntries = onlyDiffs
                ? group.entries.filter((entry) => entry.status !== "same")
                : group.entries;
              return (
                <AccordionItem key={group.id} value={group.id}>
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      {t(`compare.groups.${group.id}`, { defaultValue: group.label })}
                      {group.diffCount > 0 ? (
                        <Badge variant="secondary">{t("compare.groupDiffs", { count: group.diffCount })}</Badge>
                      ) : (
                        <Badge variant="outline">{t("compare.groupIdentical")}</Badge>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    {visibleEntries.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">{t("compare.groupEmpty")}</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("compare.convar")}</TableHead>
                            <TableHead>{t("compare.columnA", { name: accountDisplayName(diff.a) })}</TableHead>
                            <TableHead>{t("compare.columnB", { name: accountDisplayName(diff.b) })}</TableHead>
                            <TableHead className="w-24">{t("compare.status")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleEntries.map((entry) => (
                            <TableRow key={entry.key} className={cn(entry.status !== "same" && "bg-muted/50")}>
                              <TableCell className="max-w-0 break-all whitespace-normal font-mono text-xs">
                                {entry.key}
                              </TableCell>
                              <TableCell className="max-w-0 break-all whitespace-normal font-mono text-xs">
                                {entry.aValue ?? <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="max-w-0 break-all whitespace-normal font-mono text-xs">
                                {entry.bValue ?? <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>{statusBadge(entry, t)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </>
      )}

      <TransferDialog
        accounts={accounts}
        defaultFromId={aId}
        defaultToId={bId}
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onDone={() => setDiffVersion((v) => v + 1)}
      />
    </div>
  );
}
