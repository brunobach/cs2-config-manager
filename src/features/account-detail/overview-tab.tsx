import type { ComponentType, ReactNode } from "react";

import { Crosshair, Eye, Monitor, Mouse, Radar } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccountConfig } from "@/lib/types";

import { CrosshairPreview } from "./crosshair-preview";
import { VIDEO_QUALITY_KEYS, boolLabel, crosshairColorLabel, crosshairStyleLabel, reflexLabel } from "./cs2-labels";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right tabular-nums">{value}</span>
    </>
  );
}

interface InfoCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  className?: string;
  children: ReactNode;
}

function InfoCard({ icon: Icon, title, className, children }: InfoCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">{children}</div>
      </CardContent>
    </Card>
  );
}

interface OverviewTabProps {
  config: AccountConfig;
}

export function OverviewTab({ config }: OverviewTabProps) {
  const { t } = useTranslation();
  const { video, convars } = config;

  const width = Number.parseInt(video["setting.defaultres"] ?? "", 10);
  const height = Number.parseInt(video["setting.defaultresheight"] ?? "", 10);
  const hasResolution = Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
  const divisor = hasResolution ? gcd(width, height) : 1;

  const rateNum = Number.parseFloat(video["setting.refreshrate_numerator"] ?? "");
  const rateDen = Number.parseFloat(video["setting.refreshrate_denominator"] ?? "");
  let refreshRate: string | null = null;
  if (Number.isFinite(rateNum)) {
    refreshRate =
      Number.isFinite(rateDen) && rateDen > 0 ? `${Math.round(rateNum / rateDen)} Hz` : `${Math.round(rateNum)} Hz`;
  }

  const fullscreen = video["setting.fullscreen"];
  const noBorder = video["setting.nowindowborder"];
  const displayMode =
    fullscreen === undefined && noBorder === undefined
      ? null
      : fullscreen === "1"
        ? t("accounts.displayMode.fullscreen")
        : noBorder === "1"
          ? t("accounts.displayMode.borderless")
          : t("accounts.displayMode.windowed");

  const msaa = video["setting.msaa_samples"];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crosshair className="size-4" />
            {t("crosshair.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid items-start gap-4 md:grid-cols-2">
            <CrosshairPreview convars={convars} />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <InfoRow label={t("crosshair.style")} value={crosshairStyleLabel(convars.cl_crosshairstyle, t)} />
              <InfoRow label={t("crosshair.color")} value={crosshairColorLabel(convars.cl_crosshaircolor, t)} />
              <InfoRow label={t("crosshair.size")} value={convars.cl_crosshairsize ?? "—"} />
              <InfoRow label={t("crosshair.gap")} value={convars.cl_crosshairgap ?? "—"} />
              <InfoRow label={t("crosshair.thickness")} value={convars.cl_crosshairthickness ?? "—"} />
              <InfoRow label={t("crosshair.dot")} value={boolLabel(convars.cl_crosshairdot, t)} />
              <InfoRow label={t("crosshair.outline")} value={boolLabel(convars.cl_crosshair_drawoutline, t)} />
              <InfoRow
                label={t("crosshair.alpha")}
                value={
                  convars.cl_crosshairusealpha === "true" ? (convars.cl_crosshairalpha ?? "—") : t("crosshair.opaque")
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <InfoCard icon={Monitor} title={t("detail.video.title")}>
        <InfoRow
          label={t("detail.video.resolution")}
          value={hasResolution ? `${width}×${height} (${width / divisor}:${height / divisor})` : "—"}
        />
        <InfoRow label={t("detail.video.refreshRate")} value={refreshRate ?? "—"} />
        <InfoRow label={t("detail.video.displayMode")} value={displayMode ?? "—"} />
        <InfoRow label="VSync" value={boolLabel(video["setting.mat_vsync"], t)} />
        <InfoRow label="MSAA" value={msaa === undefined ? "—" : msaa === "0" ? t("common.off") : `${msaa}x`} />
        <InfoRow label="NVIDIA Reflex" value={reflexLabel(video["setting.r_low_latency"], t)} />
        {VIDEO_QUALITY_KEYS.filter(({ key }) => video[key] !== undefined).map(({ key, labelKey }) => (
          <InfoRow key={key} label={t(labelKey)} value={video[key]} />
        ))}
      </InfoCard>

      <InfoCard icon={Eye} title={t("detail.viewmodel.title")}>
        <InfoRow label="FOV" value={convars.viewmodel_fov ?? "—"} />
        <InfoRow label="Offset X" value={convars.viewmodel_offset_x ?? "—"} />
        <InfoRow label="Offset Y" value={convars.viewmodel_offset_y ?? "—"} />
        <InfoRow label="Offset Z" value={convars.viewmodel_offset_z ?? "—"} />
        <InfoRow label={t("detail.viewmodel.preset")} value={convars.viewmodel_presetpos ?? "—"} />
      </InfoCard>

      <InfoCard icon={Mouse} title={t("detail.mouse.title")}>
        <InfoRow label={t("detail.mouse.sensitivity")} value={convars.sensitivity ?? "—"} />
        <InfoRow label={t("detail.mouse.zoomSensitivity")} value={convars.zoom_sensitivity_ratio_mouse ?? "—"} />
        {convars.m_rawinput !== undefined && <InfoRow label="Raw input" value={boolLabel(convars.m_rawinput, t)} />}
        {convars.m_customaccel !== undefined && (
          <InfoRow
            label={t("detail.mouse.acceleration")}
            value={convars.m_customaccel === "0" ? t("detail.mouse.accelOff") : convars.m_customaccel}
          />
        )}
      </InfoCard>

      <InfoCard icon={Radar} title={t("detail.radar.title")}>
        {convars.cl_hud_radar_scale !== undefined && (
          <InfoRow label={t("detail.radar.size")} value={convars.cl_hud_radar_scale} />
        )}
        {convars.cl_radar_scale !== undefined && <InfoRow label={t("detail.radar.zoom")} value={convars.cl_radar_scale} />}
        {convars.cl_radar_rotate !== undefined && (
          <InfoRow label={t("detail.radar.rotates")} value={boolLabel(convars.cl_radar_rotate, t)} />
        )}
        {convars.hud_scaling !== undefined && <InfoRow label={t("detail.radar.hudScale")} value={convars.hud_scaling} />}
        {convars.cl_radar_always_centered !== undefined && (
          <InfoRow label={t("detail.radar.centered")} value={boolLabel(convars.cl_radar_always_centered, t)} />
        )}
        {convars.cl_radar_icon_scale_min !== undefined && (
          <InfoRow label={t("detail.radar.iconScale")} value={convars.cl_radar_icon_scale_min} />
        )}
        {convars.cl_hud_radar_scale === undefined &&
          convars.cl_radar_scale === undefined &&
          convars.cl_radar_rotate === undefined &&
          convars.hud_scaling === undefined &&
          convars.cl_radar_always_centered === undefined &&
          convars.cl_radar_icon_scale_min === undefined && (
            <span className="col-span-2 text-muted-foreground">{t("detail.radar.empty")}</span>
          )}
      </InfoCard>
    </div>
  );
}
