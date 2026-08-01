import { useState } from "react";

import type { TFunction } from "i18next";
import { Crosshair, Eye, Monitor, Mouse, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { updateConfigKeys } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import type { AccountConfig, ConfigTarget } from "@/lib/types";

import { CrosshairPreview } from "./crosshair-preview";
import { VIDEO_QUALITY_KEYS, crosshairColorOptions, crosshairStyleOptions } from "./cs2-labels";

function num(map: Record<string, string>, key: string, fallback: number): number {
  const value = Number.parseFloat(map[key] ?? "");
  return Number.isFinite(value) ? value : fallback;
}

/** Serializa número para convar sem zeros à direita ("2.50" -> "2.5"). */
function str(value: number): string {
  return String(Math.round(value * 100) / 100);
}

async function saveChanges(
  accountId: string,
  target: ConfigTarget,
  changes: Record<string, string>,
  t: TFunction,
): Promise<boolean> {
  try {
    const result = await updateConfigKeys(accountId, target, changes);
    toast.success(result.backupId ? t("common.savedWithBackup") : t("common.saved"));
    return true;
  } catch (err) {
    toast.error(errorMessage(err, t));
    return false;
  }
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm text-muted-foreground tabular-nums">{value}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function SwitchField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SaveButton({ submitting, onClick }: { submitting: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button size="sm" onClick={onClick} disabled={submitting}>
      {submitting ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
      {t("common.saveChanges")}
    </Button>
  );
}

interface CardProps {
  accountId: string;
  onSaved: () => Promise<void> | void;
}

function CrosshairCard({ accountId, convars, onSaved }: CardProps & { convars: Record<string, string> }) {
  const { t } = useTranslation();
  const [size, setSize] = useState(() => num(convars, "cl_crosshairsize", 5));
  const [gap, setGap] = useState(() => num(convars, "cl_crosshairgap", 0));
  const [thickness, setThickness] = useState(() => num(convars, "cl_crosshairthickness", 1));
  const [alpha, setAlpha] = useState(() => num(convars, "cl_crosshairalpha", 255));
  const [dot, setDot] = useState(() => convars.cl_crosshairdot === "true");
  const [drawOutline, setDrawOutline] = useState(() => convars.cl_crosshair_drawoutline === "true");
  const [style, setStyle] = useState(() => convars.cl_crosshairstyle ?? "4");
  const [color, setColor] = useState(() => convars.cl_crosshaircolor ?? "1");
  const [colorR, setColorR] = useState(() => num(convars, "cl_crosshaircolor_r", 255));
  const [colorG, setColorG] = useState(() => num(convars, "cl_crosshaircolor_g", 255));
  const [colorB, setColorB] = useState(() => num(convars, "cl_crosshaircolor_b", 255));
  const [submitting, setSubmitting] = useState(false);

  const previewConvars: Record<string, string> = {
    cl_crosshairsize: str(size),
    cl_crosshairgap: str(gap),
    cl_crosshairthickness: str(thickness),
    cl_crosshairalpha: str(alpha),
    cl_crosshairusealpha: "true",
    cl_crosshairdot: String(dot),
    cl_crosshair_drawoutline: String(drawOutline),
    cl_crosshaircolor: color,
    cl_crosshaircolor_r: str(colorR),
    cl_crosshaircolor_g: str(colorG),
    cl_crosshaircolor_b: str(colorB),
  };

  async function handleSave() {
    setSubmitting(true);
    const ok = await saveChanges(
      accountId,
      "convars",
      {
        cl_crosshairsize: str(size),
        cl_crosshairgap: str(gap),
        cl_crosshairthickness: str(thickness),
        cl_crosshairalpha: str(alpha),
        cl_crosshairusealpha: "true",
        cl_crosshairdot: String(dot),
        cl_crosshair_drawoutline: String(drawOutline),
        cl_crosshairstyle: style,
        cl_crosshaircolor: color,
        cl_crosshaircolor_r: str(colorR),
        cl_crosshaircolor_g: str(colorG),
        cl_crosshaircolor_b: str(colorB),
      },
      t,
    );
    setSubmitting(false);
    if (ok) await onSaved();
  }

  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Crosshair className="size-4" />
          {t("crosshair.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <SliderField label={t("crosshair.size")} value={size} min={0} max={10} step={0.1} onChange={setSize} />
            <SliderField label={t("crosshair.gap")} value={gap} min={-5} max={5} step={0.1} onChange={setGap} />
            <SliderField
              label={t("crosshair.thickness")}
              value={thickness}
              min={0}
              max={3}
              step={0.1}
              onChange={setThickness}
            />
            <SliderField label={t("crosshair.alpha")} value={alpha} min={0} max={255} step={1} onChange={setAlpha} />
            <SwitchField id="ch-dot" label={t("crosshair.dot")} checked={dot} onChange={setDot} />
            <SwitchField id="ch-outline" label={t("crosshair.outline")} checked={drawOutline} onChange={setDrawOutline} />
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                id="ch-style"
                label={t("crosshair.style")}
                value={style}
                options={crosshairStyleOptions(t)}
                onChange={setStyle}
              />
              <SelectField
                id="ch-color"
                label={t("crosshair.color")}
                value={color}
                options={crosshairColorOptions(t)}
                onChange={setColor}
              />
            </div>
            {color === "5" && (
              <div className="grid grid-cols-3 gap-4">
                {(
                  [
                    ["R", colorR, setColorR],
                    ["G", colorG, setColorG],
                    ["B", colorB, setColorB],
                  ] as const
                ).map(([channel, value, setter]) => (
                  <div key={channel} className="flex flex-col gap-1.5">
                    <Label htmlFor={`ch-color-${channel}`}>{channel}</Label>
                    <Input
                      id={`ch-color-${channel}`}
                      type="number"
                      min={0}
                      max={255}
                      value={value}
                      onChange={(e) => setter(Math.min(255, Math.max(0, Number.parseInt(e.target.value, 10) || 0)))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <CrosshairPreview convars={previewConvars} className="sticky top-4" />
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <SaveButton submitting={submitting} onClick={handleSave} />
      </CardFooter>
    </Card>
  );
}

const DISPLAY_MODE_VALUES = ["fullscreen", "borderless", "windowed"] as const;

const MSAA_VALUES = ["0", "2", "4", "8"] as const;

const REFLEX_VALUES = ["0", "1", "2"] as const;

const QUALITY_OPTIONS = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
] as const;

function VideoCard({ accountId, video, onSaved }: CardProps & { video: Record<string, string> }) {
  const { t } = useTranslation();
  const [resW, setResW] = useState(() => video["setting.defaultres"] ?? "1920");
  const [resH, setResH] = useState(() => video["setting.defaultresheight"] ?? "1080");
  const [displayMode, setDisplayMode] = useState(() =>
    video["setting.fullscreen"] === "1"
      ? "fullscreen"
      : video["setting.nowindowborder"] === "1"
        ? "borderless"
        : "windowed",
  );
  const [vsync, setVsync] = useState(() => video["setting.mat_vsync"] === "1");
  const [msaa, setMsaa] = useState(() => video["setting.msaa_samples"] ?? "0");
  const [reflex, setReflex] = useState(() => video["setting.r_low_latency"] ?? "0");
  const [quality, setQuality] = useState<Record<string, string>>(() =>
    Object.fromEntries(VIDEO_QUALITY_KEYS.map(({ key }) => [key, video[key] ?? "0"])),
  );
  const [submitting, setSubmitting] = useState(false);

  const displayModeOptions = DISPLAY_MODE_VALUES.map((value) => ({
    value,
    label: t(`accounts.displayMode.${value}`),
  }));
  const msaaOptions = MSAA_VALUES.map((value) => ({ value, label: value === "0" ? t("common.off") : `${value}x` }));
  const reflexOptions = REFLEX_VALUES.map((value) => ({
    value,
    label: value === "0" ? t("common.off") : value === "1" ? t("common.on") : t("detail.video.reflexBoost"),
  }));

  async function handleSave() {
    const width = Number.parseInt(resW, 10);
    const height = Number.parseInt(resH, 10);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      toast.error(t("detail.video.invalidResolution"));
      return;
    }
    setSubmitting(true);
    const ok = await saveChanges(
      accountId,
      "video",
      {
        "setting.defaultres": String(width),
        "setting.defaultresheight": String(height),
        "setting.fullscreen": displayMode === "fullscreen" ? "1" : "0",
        "setting.nowindowborder": displayMode === "borderless" ? "1" : "0",
        "setting.mat_vsync": vsync ? "1" : "0",
        "setting.msaa_samples": msaa,
        "setting.r_low_latency": reflex,
        ...quality,
      },
      t,
    );
    setSubmitting(false);
    if (ok) await onSaved();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Monitor className="size-4" />
          {t("detail.video.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vid-res-w">{t("detail.video.width")}</Label>
            <Input id="vid-res-w" type="number" min={1} value={resW} onChange={(e) => setResW(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="vid-res-h">{t("detail.video.height")}</Label>
            <Input id="vid-res-h" type="number" min={1} value={resH} onChange={(e) => setResH(e.target.value)} />
          </div>
          <SelectField
            id="vid-mode"
            label={t("detail.video.displayMode")}
            value={displayMode}
            options={displayModeOptions}
            onChange={setDisplayMode}
          />
          <SelectField id="vid-msaa" label="MSAA" value={msaa} options={msaaOptions} onChange={setMsaa} />
          <SelectField
            id="vid-reflex"
            label="NVIDIA Reflex"
            value={reflex}
            options={reflexOptions}
            onChange={setReflex}
          />
          <div className="flex items-end pb-0.5">
            <SwitchField id="vid-vsync" label="VSync" checked={vsync} onChange={setVsync} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">{t("detail.video.qualityHint")}</p>
          <div className="grid grid-cols-2 gap-4">
            {VIDEO_QUALITY_KEYS.map(({ key, labelKey }) => (
              <SelectField
                key={key}
                id={`vid-q-${key}`}
                label={t(labelKey)}
                value={quality[key] ?? "0"}
                options={QUALITY_OPTIONS}
                onChange={(value) => setQuality((prev) => ({ ...prev, [key]: value }))}
              />
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <SaveButton submitting={submitting} onClick={handleSave} />
      </CardFooter>
    </Card>
  );
}

function ViewmodelCard({ accountId, convars, onSaved }: CardProps & { convars: Record<string, string> }) {
  const { t } = useTranslation();
  const [fov, setFov] = useState(() => num(convars, "viewmodel_fov", 60));
  const [offsetX, setOffsetX] = useState(() => num(convars, "viewmodel_offset_x", 0));
  const [offsetY, setOffsetY] = useState(() => num(convars, "viewmodel_offset_y", 0));
  const [offsetZ, setOffsetZ] = useState(() => num(convars, "viewmodel_offset_z", 0));
  const [presetpos, setPresetpos] = useState(() => convars.viewmodel_presetpos ?? "0");
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    const ok = await saveChanges(
      accountId,
      "convars",
      {
        viewmodel_fov: str(fov),
        viewmodel_offset_x: str(offsetX),
        viewmodel_offset_y: str(offsetY),
        viewmodel_offset_z: str(offsetZ),
        viewmodel_presetpos: presetpos,
      },
      t,
    );
    setSubmitting(false);
    if (ok) await onSaved();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="size-4" />
          {t("detail.viewmodel.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SliderField label="FOV" value={fov} min={54} max={68} step={0.5} onChange={setFov} />
        <SliderField label="Offset X" value={offsetX} min={-2.5} max={2.5} step={0.1} onChange={setOffsetX} />
        <SliderField label="Offset Y" value={offsetY} min={-2.5} max={2.5} step={0.1} onChange={setOffsetY} />
        <SliderField label="Offset Z" value={offsetZ} min={-2.5} max={2.5} step={0.1} onChange={setOffsetZ} />
        <SelectField
          id="vm-preset"
          label={t("detail.viewmodel.preset")}
          value={presetpos}
          options={[
            { value: "0", label: "0" },
            { value: "1", label: "1" },
            { value: "2", label: "2" },
            { value: "3", label: "3" },
          ]}
          onChange={setPresetpos}
        />
      </CardContent>
      <CardFooter className="justify-end">
        <SaveButton submitting={submitting} onClick={handleSave} />
      </CardFooter>
    </Card>
  );
}

function MouseCard({ accountId, convars, onSaved }: CardProps & { convars: Record<string, string> }) {
  const { t } = useTranslation();
  const [sensitivity, setSensitivity] = useState(() => convars.sensitivity ?? "1");
  const [zoomSensitivity, setZoomSensitivity] = useState(() => convars.zoom_sensitivity_ratio_mouse ?? "1");
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    const sens = Number.parseFloat(sensitivity);
    const zoom = Number.parseFloat(zoomSensitivity);
    if (!Number.isFinite(sens) || sens <= 0 || !Number.isFinite(zoom) || zoom <= 0) {
      toast.error(t("detail.mouse.invalidSensitivity"));
      return;
    }
    setSubmitting(true);
    const ok = await saveChanges(
      accountId,
      "convars",
      {
        sensitivity: str(sens),
        zoom_sensitivity_ratio_mouse: str(zoom),
      },
      t,
    );
    setSubmitting(false);
    if (ok) await onSaved();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mouse className="size-4" />
          {t("detail.mouse.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mouse-sens">{t("detail.mouse.sensitivity")}</Label>
            <Input
              id="mouse-sens"
              type="number"
              min={0.01}
              step={0.01}
              value={sensitivity}
              onChange={(e) => setSensitivity(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mouse-zoom">{t("detail.mouse.zoomSensitivity")}</Label>
            <Input
              id="mouse-zoom"
              type="number"
              min={0.01}
              step={0.01}
              value={zoomSensitivity}
              onChange={(e) => setZoomSensitivity(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <SaveButton submitting={submitting} onClick={handleSave} />
      </CardFooter>
    </Card>
  );
}

interface EditTabProps {
  accountId: string;
  config: AccountConfig;
  onSaved: () => Promise<void> | void;
}

export function EditTab({ accountId, config, onSaved }: EditTabProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <CrosshairCard accountId={accountId} convars={config.convars} onSaved={onSaved} />
      <VideoCard accountId={accountId} video={config.video} onSaved={onSaved} />
      <ViewmodelCard accountId={accountId} convars={config.convars} onSaved={onSaved} />
      <MouseCard accountId={accountId} convars={config.convars} onSaved={onSaved} />
    </div>
  );
}
