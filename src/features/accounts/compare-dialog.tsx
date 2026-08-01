import { useEffect, useState } from "react";

import { GitCompareArrows } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import type { SteamAccountSummary } from "@/lib/types";

import { AccountSelect } from "./account-select";

interface CompareDialogProps {
  accounts: SteamAccountSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompareDialog({ accounts, open, onOpenChange }: CompareDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");

  useEffect(() => {
    if (!open) return;
    setAId("");
    setBId("");
  }, [open]);

  function handleCompare() {
    if (!aId || !bId) {
      toast.error(t("compare.dialog.selectBoth"));
      return;
    }
    if (aId === bId) {
      toast.error(t("compare.sameAccount.title"));
      return;
    }
    onOpenChange(false);
    navigate(`/compare?a=${aId}&b=${bId}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("compare.title")}</DialogTitle>
          <DialogDescription>{t("compare.dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compare-a">{t("compare.accountA")}</Label>
            <AccountSelect id="compare-a" accounts={accounts} value={aId} onChange={setAId} excludeId={bId} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compare-b">{t("compare.accountB")}</Label>
            <AccountSelect id="compare-b" accounts={accounts} value={bId} onChange={setBId} excludeId={aId} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleCompare}>
            <GitCompareArrows data-icon="inline-start" />
            {t("compare.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
