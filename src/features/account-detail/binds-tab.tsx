import { useState } from "react";

import { Pencil, Plus, RotateCcw, Save, Search, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { updateConfigKeys } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { KeyBind } from "@/lib/types";

interface AddedBind {
  id: number;
  key: string;
  command: string;
}

interface BindsTabProps {
  accountId: string;
  binds: KeyBind[];
  onSaved: () => Promise<void> | void;
}

export function BindsTab({ accountId, binds, onSaved }: BindsTabProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [deleted, setDeleted] = useState<string[]>([]);
  const [added, setAdded] = useState<AddedBind[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newCommand, setNewCommand] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const hasChanges = Object.keys(edits).length > 0 || deleted.length > 0 || added.length > 0;

  const normalizedQuery = query.trim().toLowerCase();
  const existingRows = binds
    .map((bind) => ({
      rowId: `existing-${bind.key}`,
      key: bind.key,
      command: edits[bind.key] ?? bind.command,
      removed: deleted.includes(bind.key),
      original: bind.command as string | null,
    }))
    .concat(
      added.map((bind) => ({
        rowId: `added-${bind.id}`,
        key: bind.key,
        command: bind.command,
        removed: false,
        original: null,
      })),
    );
  const visibleRows = normalizedQuery
    ? existingRows.filter(
        (row) => row.key.toLowerCase().includes(normalizedQuery) || row.command.toLowerCase().includes(normalizedQuery),
      )
    : existingRows;

  function startEdit(rowId: string, command: string) {
    setEditingRowId(rowId);
    setEditingValue(command);
  }

  function commitEdit(rowId: string, key: string, original: string | null) {
    setEditingRowId(null);
    const value = editingValue.trim();
    if (original === null) {
      setAdded((prev) => prev.map((bind) => (`added-${bind.id}` === rowId ? { ...bind, command: value } : bind)));
      return;
    }
    setEdits((prev) => {
      const next = { ...prev };
      if (value === original) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  function toggleRemoved(key: string) {
    setDeleted((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function removeAdded(id: number) {
    setAdded((prev) => prev.filter((bind) => bind.id !== id));
  }

  function handleAdd() {
    const key = newKey.trim().toUpperCase();
    if (!key) return;
    if (binds.some((bind) => bind.key.toUpperCase() === key) || added.some((bind) => bind.key === key)) {
      toast.error(t("binds.duplicateKey"));
      return;
    }
    setAdded((prev) => [...prev, { id: Date.now(), key, command: newCommand.trim() }]);
    setNewKey("");
    setNewCommand("");
  }

  function handleDiscard() {
    setEdits({});
    setDeleted([]);
    setAdded([]);
    setEditingRowId(null);
  }

  async function handleSave() {
    const changes: Record<string, string> = {};
    for (const [key, command] of Object.entries(edits)) {
      if (!deleted.includes(key)) changes[key.toUpperCase()] = command;
    }
    for (const bind of added) {
      changes[bind.key] = bind.command;
    }
    const deleteKeys = deleted.map((key) => key.toUpperCase());

    setSubmitting(true);
    try {
      const result = await updateConfigKeys(accountId, "binds", changes, deleteKeys);
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
            placeholder={t("binds.searchPlaceholder")}
            className="pl-8"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={handleDiscard} disabled={!hasChanges || submitting}>
            {t("binds.discard")}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || submitting}>
            {submitting ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {t("common.saveChanges")}
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-36">{t("binds.key")}</TableHead>
            <TableHead>{t("binds.command")}</TableHead>
            <TableHead className="w-20">
              <span className="sr-only">{t("common.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                {normalizedQuery ? t("binds.emptySearch") : t("binds.empty")}
              </TableCell>
            </TableRow>
          )}
          {visibleRows.map((row) => {
            const isEditing = editingRowId === row.rowId;
            const isAddedRow = row.original === null;
            return (
              <TableRow key={row.rowId} className={cn(row.removed && "opacity-50")}>
                <TableCell>
                  <Kbd className={cn("font-mono", row.removed && "line-through")}>{row.key}</Kbd>
                </TableCell>
                <TableCell className="max-w-0 whitespace-normal">
                  {isEditing ? (
                    <Input
                      autoFocus
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => commitEdit(row.rowId, row.key, row.original)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit(row.rowId, row.key, row.original);
                        if (e.key === "Escape") setEditingRowId(null);
                      }}
                      className="h-7 font-mono text-xs"
                      spellCheck={false}
                    />
                  ) : row.command === "<unbound>" ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help font-mono text-xs italic text-muted-foreground">
                          &lt;unbound&gt;
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{t("binds.unboundTooltip")}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <button
                      type="button"
                      className={cn(
                        "break-all text-left font-mono text-xs hover:underline",
                        row.removed && "line-through",
                      )}
                      onClick={() => !row.removed && startEdit(row.rowId, row.command)}
                    >
                      {row.command}
                    </button>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {!row.removed && !isAddedRow && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("binds.editBind")}
                        onClick={() => startEdit(row.rowId, row.command)}
                      >
                        <Pencil />
                      </Button>
                    )}
                    {isAddedRow ? (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("binds.removeBind")}
                        onClick={() => removeAdded(Number(row.rowId.replace("added-", "")))}
                      >
                        <Trash2 />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={row.removed ? t("binds.undoRemove") : t("binds.removeBind")}
                        onClick={() => toggleRemoved(row.key)}
                      >
                        {row.removed ? <RotateCcw /> : <Trash2 />}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow>
            <TableCell>
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder={t("binds.key")}
                className="h-7 font-mono text-xs uppercase"
                spellCheck={false}
              />
            </TableCell>
            <TableCell className="max-w-0 whitespace-normal">
              <Input
                value={newCommand}
                onChange={(e) => setNewCommand(e.target.value)}
                placeholder={t("binds.commandPlaceholder")}
                className="h-7 font-mono text-xs"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
            </TableCell>
            <TableCell>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t("binds.addBind")}
                  onClick={handleAdd}
                  disabled={!newKey.trim()}
                >
                  <Plus />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground">{t("binds.help")}</p>
    </div>
  );
}
