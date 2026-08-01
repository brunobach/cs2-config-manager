import { useEffect, useState } from "react";

import { RotateCcw } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { clearSteamPathOverride, setSteamPathOverride } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { SteamPathInfo } from "@/lib/types";

interface SteamPathDialogProps {
  info: SteamPathInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void> | void;
}

export function SteamPathDialog({ info, open, onOpenChange, onSaved }: SteamPathDialogProps) {
  const { t } = useTranslation();
  const [path, setPath] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPath(info?.path ?? "");
  }, [open, info]);

  async function submit(newPath: string, successMessage: string) {
    setSubmitting(true);
    try {
      // Caminho vazio = volta para a detecção automática.
      if (newPath === "") {
        await clearSteamPathOverride();
      } else {
        await setSteamPathOverride(newPath);
      }
      toast.success(successMessage);
      onOpenChange(false);
      await onSaved();
    } catch (err) {
      toast.error(errorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSave() {
    if (!path.trim()) {
      toast.error(t("steamPath.dialog.pathRequired"));
      return;
    }
    void submit(path.trim(), t("steamPath.dialog.updated"));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("steamPath.dialog.title")}</DialogTitle>
          <DialogDescription>
            <Trans i18nKey="steamPath.dialog.description" components={{ mono: <span className="font-mono" /> }} />
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="steam-path">{t("steamPath.title")}</Label>
          <Input
            id="steam-path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="C:\Program Files (x86)\Steam"
            className="font-mono text-xs"
            spellCheck={false}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="sm:mr-auto"
            onClick={() => void submit("", t("steamPath.dialog.autoRestored"))}
            disabled={submitting}
          >
            <RotateCcw data-icon="inline-start" />
            {t("steamPath.dialog.restoreAuto")}
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting && <Spinner data-icon="inline-start" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
