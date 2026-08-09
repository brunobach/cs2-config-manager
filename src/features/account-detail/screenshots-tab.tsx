import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getScreenshot, listScreenshots } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { ScreenshotInfo } from "@/lib/types";

interface ScreenshotsTabProps {
  accountId: string;
}

/** Blob URLs das screenshots já baixadas (`accountId/name` → object URL). */
const shotCache = new Map<string, string>();

function cacheShot(cacheKey: string, bytes: number[]): string {
  const previous = shotCache.get(cacheKey);
  if (previous) URL.revokeObjectURL(previous);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)]));
  shotCache.set(cacheKey, url);
  return url;
}

/** Resolve a blob URL de uma screenshot (com cache; null enquanto carrega). */
function useShotSrc(accountId: string, name: string): string | null {
  const cacheKey = `${accountId}/${name}`;
  const [src, setSrc] = useState<string | null>(() => shotCache.get(cacheKey) ?? null);

  useEffect(() => {
    const cached = shotCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      return;
    }
    let cancelled = false;
    getScreenshot(accountId, name)
      .then((bytes) => {
        if (cancelled || !bytes || bytes.length === 0) return;
        setSrc(cacheShot(cacheKey, bytes));
      })
      .catch(() => {
        // thumbnail sem imagem fica no skeleton; erro real aparece no dialog de lista
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, name, cacheKey]);

  return src;
}

function ShotThumb({ accountId, shot, onOpen }: { accountId: string; shot: ScreenshotInfo; onOpen: () => void }) {
  const src = useShotSrc(accountId, shot.name);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-video overflow-hidden rounded-md border bg-muted"
    >
      {src ? (
        <img
          src={src}
          alt={shot.name}
          loading="lazy"
          className="size-full object-cover transition-transform group-hover:scale-105"
        />
      ) : (
        <Skeleton className="size-full" />
      )}
    </button>
  );
}

function FullShot({ accountId, name }: { accountId: string; name: string }) {
  const src = useShotSrc(accountId, name);
  if (!src) return <Skeleton className="aspect-video w-full" />;
  return <img src={src} alt={name} className="w-full rounded-md" />;
}

export function ScreenshotsTab({ accountId }: ScreenshotsTabProps) {
  const { t } = useTranslation();
  const [shots, setShots] = useState<ScreenshotInfo[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listScreenshots(accountId)
      .then((data) => {
        if (!cancelled) setShots(data);
      })
      .catch((err) => toast.error(errorMessage(err, t)));
    return () => {
      cancelled = true;
    };
  }, [accountId, t]);

  if (shots === null) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {["a", "b", "c", "d"].map((k) => (
          <Skeleton key={k} className="aspect-video w-full" />
        ))}
      </div>
    );
  }

  if (shots.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("screenshots.empty")}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {shots.map((shot) => (
          <ShotThumb key={shot.name} accountId={accountId} shot={shot} onOpen={() => setSelected(shot.name)} />
        ))}
      </div>
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-xs">{selected}</DialogTitle>
          </DialogHeader>
          {selected !== null && <FullShot accountId={accountId} name={selected} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
