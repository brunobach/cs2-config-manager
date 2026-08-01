import { FolderOpen, HardDrive } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SteamPathInfo, SteamPathSource } from "@/lib/types";

const SOURCE_KEYS: Record<Exclude<SteamPathSource, null>, string> = {
  auto: "steamPath.source.auto",
  override: "steamPath.source.override",
  env: "steamPath.source.env",
};

interface SteamPathCardProps {
  info: SteamPathInfo | null;
  onChangePath: () => void;
}

export function SteamPathCard({ info, onChangePath }: SteamPathCardProps) {
  const { t } = useTranslation();

  if (info === null) {
    return <Skeleton className="h-28 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="size-4" />
          {t("steamPath.title")}
        </CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" onClick={onChangePath}>
            <FolderOpen data-icon="inline-start" />
            {t("steamPath.change")}
          </Button>
        </CardAction>
        <CardDescription className="flex flex-wrap items-center gap-2">
          {info.path ? (
            <>
              <span className="min-w-0 truncate font-mono text-xs" title={info.path}>
                {info.path}
              </span>
              {info.source && <Badge variant="secondary">{t(SOURCE_KEYS[info.source])}</Badge>}
            </>
          ) : (
            <span>{t("common.steamNotDetected")}</span>
          )}
        </CardDescription>
      </CardHeader>
      {(info.steamRunning || info.cs2Running || info.cs2CfgDir) && (
        <CardContent className="flex flex-col gap-2">
          {(info.steamRunning || info.cs2Running) && (
            <div className="flex flex-wrap gap-1.5">
              {info.steamRunning && (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                >
                  {t("steamPath.steamRunning")}
                </Badge>
              )}
              {info.cs2Running && (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                >
                  {t("steamPath.cs2Running")}
                </Badge>
              )}
            </div>
          )}
          {info.cs2CfgDir && (
            <p className="truncate text-xs text-muted-foreground" title={info.cs2CfgDir}>
              {t("steamPath.cfgDir")} <span className="font-mono">{info.cs2CfgDir}</span>
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
