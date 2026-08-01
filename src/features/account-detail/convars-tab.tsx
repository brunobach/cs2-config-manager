import { useState } from "react";

import { Save, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { updateConfigKeys } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

type GroupId = "crosshair" | "viewmodel" | "mouse" | "radarHud" | "buymenu" | "others";

const GROUP_IDS: GroupId[] = ["crosshair", "viewmodel", "mouse", "radarHud", "buymenu", "others"];

function groupOf(key: string): GroupId {
  if (key.startsWith("cl_crosshair") || key.startsWith("cl_grenadecrosshair")) return "crosshair";
  if (key.startsWith("viewmodel_")) return "viewmodel";
  if (key === "sensitivity" || key.startsWith("m_") || key.startsWith("zoom_")) return "mouse";
  if (key.startsWith("cl_radar") || key.startsWith("cl_hud") || key.startsWith("hud_")) return "radarHud";
  if (key.startsWith("cl_buymenu") || key.startsWith("cl_buywheel")) return "buymenu";
  return "others";
}

interface ConvarsTabProps {
  accountId: string;
  convars: Record<string, string>;
  machineConvars: Record<string, string>;
  onSaved: () => Promise<void> | void;
}

export function ConvarsTab({ accountId, convars, machineConvars, onSaved }: ConvarsTabProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const editedCount = Object.keys(edited).length;
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (key: string, value: string) =>
    !normalizedQuery || key.toLowerCase().includes(normalizedQuery) || value.toLowerCase().includes(normalizedQuery);

  const groups = GROUP_IDS.map((id) => ({
    id,
    label: t(`convars.groups.${id}`),
    entries: Object.entries(convars)
      .filter(([key]) => groupOf(key) === id)
      .filter(([key, value]) => matchesQuery(key, value))
      .sort(([a], [b]) => a.localeCompare(b)),
  })).filter((group) => group.entries.length > 0);

  const machineEntries = Object.entries(machineConvars)
    .filter(([key, value]) => matchesQuery(key, value))
    .sort(([a], [b]) => a.localeCompare(b));

  function handleChange(key: string, original: string, value: string) {
    setEdited((prev) => {
      const next = { ...prev };
      if (value === original) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  async function handleSave() {
    setSubmitting(true);
    try {
      const result = await updateConfigKeys(accountId, "convars", edited);
      toast.success(result.backupId ? t("common.savedWithBackup") : t("common.saved"));
      await onSaved();
    } catch (err) {
      toast.error(errorMessage(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("convars.searchPlaceholder")}
            className="pl-8"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {editedCount > 0 && <Badge variant="secondary">{t("convars.editedCount", { count: editedCount })}</Badge>}
          <Button onClick={handleSave} disabled={editedCount === 0 || submitting}>
            {submitting ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {t("common.saveChanges")}
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {normalizedQuery ? t("convars.emptySearch") : t("convars.empty")}
        </p>
      ) : (
        <Accordion type="multiple" defaultValue={groups.map((group) => group.id)}>
          {groups.map((group) => (
            <AccordionItem key={group.id} value={group.id}>
              <AccordionTrigger>
                <span className="flex items-center gap-2">
                  {group.label}
                  <Badge variant="secondary">{group.entries.length}</Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col">
                  {group.entries.map(([key, value]) => (
                    <div
                      key={key}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,6rem)_auto] items-center gap-2 py-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,8rem)_auto]"
                    >
                      <span className="truncate font-mono text-xs" title={key}>
                        {key}
                      </span>
                      <span className="truncate text-right font-mono text-xs text-muted-foreground" title={value}>
                        {value}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={edited[key] ?? value}
                          onChange={(e) => handleChange(key, value, e.target.value)}
                          className="h-7 w-28 font-mono text-xs sm:w-36"
                          spellCheck={false}
                          aria-label={t("convars.editKey", { key })}
                        />
                        {edited[key] !== undefined && <Badge variant="secondary">{t("convars.edited")}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {machineEntries.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="machine">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                {t("convars.machineReadonly")}
                <Badge variant="outline">{machineEntries.length}</Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ScrollArea className="h-72 rounded-lg border">
                <div className="flex flex-col p-2">
                  {machineEntries.map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 py-0.5">
                      <span className="truncate font-mono text-xs" title={key}>
                        {key}
                      </span>
                      <span className="truncate text-right font-mono text-xs text-muted-foreground" title={value}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
