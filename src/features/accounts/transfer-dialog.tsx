import { useEffect, useState } from "react";

import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { transferConfigs } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { SteamAccountSummary, TransferSections } from "@/lib/types";

import { AccountSelect } from "./account-select";

const SECTION_IDS = ["video", "convars", "binds", "machine"] as const;

interface TransferDialogProps {
  accounts: SteamAccountSummary[];
  defaultFromId?: string;
  defaultToId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}

export function TransferDialog({
  accounts,
  defaultFromId,
  defaultToId,
  open,
  onOpenChange,
  onDone,
}: TransferDialogProps) {
  const { t } = useTranslation();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [sections, setSections] = useState<Record<keyof TransferSections, boolean>>({
    video: true,
    convars: true,
    binds: true,
    machine: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const from = defaultFromId ?? "";
    setFromId(from);
    setToId(defaultToId && defaultToId !== from ? defaultToId : "");
    setSections({ video: true, convars: true, binds: true, machine: false });
  }, [open, defaultFromId, defaultToId]);

  const anySection = Object.values(sections).some(Boolean);

  async function handleConfirm() {
    if (!fromId || !toId) {
      toast.error(t("transfer.selectBoth"));
      return;
    }
    if (fromId === toId) {
      toast.error(t("transfer.sameAccount"));
      return;
    }
    if (!anySection) {
      toast.error(t("transfer.selectSection"));
      return;
    }

    setSubmitting(true);
    try {
      const result = await transferConfigs(fromId, toId, sections);
      toast.success(
        result.backupId
          ? t("transfer.successWithBackup", { count: result.copied.length })
          : t("transfer.success", { count: result.copied.length }),
      );
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      toast.error(errorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("transfer.title")}</DialogTitle>
          <DialogDescription>{t("transfer.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transfer-from">{t("transfer.from")}</Label>
              <AccountSelect
                id="transfer-from"
                accounts={accounts}
                value={fromId}
                onChange={setFromId}
                excludeId={toId}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="transfer-to">{t("transfer.to")}</Label>
              <AccountSelect id="transfer-to" accounts={accounts} value={toId} onChange={setToId} excludeId={fromId} />
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <Label>{t("transfer.sections")}</Label>
            {SECTION_IDS.map((sectionId) => (
              <div key={sectionId} className="flex items-center gap-2">
                <Checkbox
                  id={`transfer-section-${sectionId}`}
                  checked={sections[sectionId]}
                  onCheckedChange={(checked) => setSections((prev) => ({ ...prev, [sectionId]: checked === true }))}
                />
                <Label htmlFor={`transfer-section-${sectionId}`} className="font-normal">
                  {t(`transfer.section.${sectionId}.label`)}{" "}
                  <span className="text-muted-foreground">({t(`transfer.section.${sectionId}.hint`)})</span>
                </Label>
              </div>
            ))}
          </div>

          <Alert className="border-amber-500/50 text-amber-700 dark:text-amber-400">
            <TriangleAlert />
            <AlertTitle>{t("transfer.warning.title")}</AlertTitle>
            <AlertDescription className="text-amber-700/80 dark:text-amber-400/80">
              {t("transfer.warning.description")}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting && <Spinner data-icon="inline-start" />}
            {t("transfer.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
