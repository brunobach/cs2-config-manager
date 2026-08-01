import { useCallback, useEffect, useState } from "react";

import { Archive, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createBackup, listBackups, restoreBackup } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { BackupInfo } from "@/lib/types";

interface BackupsTabProps {
  accountId: string;
  version: number;
  onRestored: () => Promise<void> | void;
}

export function BackupsTab({ accountId, version, onRestored }: BackupsTabProps) {
  const { t } = useTranslation();
  const [backups, setBackups] = useState<BackupInfo[] | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await listBackups(accountId);
      setBackups(data);
    } catch (err) {
      toast.error(errorMessage(err, t));
      setBackups([]);
    }
  }, [accountId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh, version]);

  async function handleCreate() {
    setCreating(true);
    try {
      await createBackup(accountId);
      toast.success(t("backups.created"));
      await refresh();
    } catch (err) {
      toast.error(errorMessage(err, t));
    } finally {
      setCreating(false);
    }
  }

  async function handleRestore(backupId: string) {
    try {
      await restoreBackup(accountId, backupId);
      toast.success(t("backups.restored"));
      await Promise.all([refresh(), onRestored()]);
    } catch (err) {
      toast.error(errorMessage(err, t));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleCreate} disabled={creating}>
          <Archive data-icon="inline-start" />
          {t("backups.createNow")}
        </Button>
      </div>

      {backups === null ? (
        <div className="flex flex-col gap-2">
          {["a", "b", "c"].map((k) => (
            <Skeleton key={k} className="h-10 w-full" />
          ))}
        </div>
      ) : backups.length === 0 ? (
        <Empty className="min-h-64 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Archive />
            </EmptyMedia>
            <EmptyTitle>{t("backups.empty.title")}</EmptyTitle>
            <EmptyDescription>{t("backups.empty.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("backups.date")}</TableHead>
              <TableHead>{t("backups.files")}</TableHead>
              <TableHead>ID</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">{t("common.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {backups.map((backup) => {
              const totalSize = backup.files.reduce((sum, file) => sum + file.size, 0);
              return (
                <TableRow key={backup.backupId}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(backup.createdAt)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t("backups.filesCount", { count: backup.files.length, size: formatBytes(totalSize) })}
                  </TableCell>
                  <TableCell className="max-w-40 truncate font-mono text-xs text-muted-foreground">
                    {backup.backupId}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <RotateCcw data-icon="inline-start" />
                          {t("common.restore")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("backups.confirm.title")}</AlertDialogTitle>
                          <AlertDialogDescription>{t("backups.confirm.description")}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRestore(backup.backupId)}>
                            {t("common.restore")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
