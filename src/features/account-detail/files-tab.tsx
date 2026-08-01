import { useState } from "react";

import { FileText, Save, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { writeRawFile } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { AccountConfig, ConfigTarget } from "@/lib/types";

const TARGET_VALUES: ConfigTarget[] = ["video", "convars", "binds", "machine"];

interface FilesTabProps {
  accountId: string;
  config: AccountConfig;
  onSaved: () => Promise<void> | void;
}

export function FilesTab({ accountId, config, onSaved }: FilesTabProps) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<ConfigTarget>("video");
  const [content, setContent] = useState(() => config.raw.video ?? "");
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Re-sincroniza o editor quando a config é recarregada (após salvar/restaurar).
  const [prevRaw, setPrevRaw] = useState(config.raw);
  if (config.raw !== prevRaw) {
    setPrevRaw(config.raw);
    setContent(config.raw[target] ?? "");
    setCreating(false);
  }

  const raw = config.raw[target];
  const fileInfo = config.files.find((file) => file.target === target);
  const dirty = creating ? content.length > 0 : raw !== null && content !== raw;

  function selectTarget(value: string) {
    const next = value as ConfigTarget;
    setTarget(next);
    setContent(config.raw[next] ?? "");
    setCreating(false);
  }

  async function handleSave() {
    setSubmitting(true);
    try {
      const result = await writeRawFile(accountId, target, content);
      toast.success(result.backupId ? t("files.savedWithBackup") : t("files.saved"));
      await onSaved();
    } catch (err) {
      toast.error(errorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-72 flex-1 flex-col gap-1.5">
          <Label htmlFor="file-target">{t("files.fileLabel")}</Label>
          <Select value={target} onValueChange={selectTarget}>
            <SelectTrigger id="file-target" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`files.targets.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {fileInfo && (
          <p className="text-xs text-muted-foreground">
            {t("files.modifiedAt", { size: formatBytes(fileInfo.size), date: formatDateTime(fileInfo.mtime) })}
          </p>
        )}
      </div>

      {raw === null && !creating ? (
        <Empty className="min-h-64 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>{t("files.missing.title")}</EmptyTitle>
            <EmptyDescription>{t("files.missing.description")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => setCreating(true)}>
              {t("files.missing.create")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          {raw === null && (
            <Alert className="border-amber-500/50 text-amber-700 dark:text-amber-400">
              <TriangleAlert />
              <AlertTitle>{t("files.new.title")}</AlertTitle>
              <AlertDescription className="text-amber-700/80 dark:text-amber-400/80">
                {t("files.new.description")}
              </AlertDescription>
            </Alert>
          )}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[400px] font-mono text-xs"
            spellCheck={false}
            aria-label={t("files.contentAria")}
          />
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!dirty || submitting}>
                  {submitting ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
                  {t("files.save")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("files.confirm.title")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("files.confirm.description")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSave}>{t("files.save")}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </div>
  );
}
