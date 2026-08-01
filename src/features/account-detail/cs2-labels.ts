import type { TFunction } from "i18next";

/** Labels de config do CS2 compartilhados entre visão geral e edição — resolvem chaves i18n via `t`. */

const CROSSHAIR_STYLE_VALUES = ["4", "5", "0", "1", "2", "3"] as const;

export function crosshairStyleLabel(style: string | undefined, t: TFunction): string {
  if (style === undefined) return "—";
  if (style === "4") return t("crosshair.styles.static");
  if (style === "5") return t("crosshair.styles.dynamic");
  return t("crosshair.styles.classic", { style });
}

export function crosshairStyleOptions(t: TFunction): { value: string; label: string }[] {
  return CROSSHAIR_STYLE_VALUES.map((value) => ({ value, label: crosshairStyleLabel(value, t) }));
}

/** Mapeamento de `cl_crosshaircolor` para as chaves i18n (0-4 presets, 5 = RGB custom). */
const CROSSHAIR_COLOR_KEYS: Record<string, string> = {
  "0": "crosshair.colors.red",
  "1": "crosshair.colors.green",
  "2": "crosshair.colors.yellow",
  "3": "crosshair.colors.blue",
  "4": "crosshair.colors.cyan",
  "5": "crosshair.colors.custom",
};

const CROSSHAIR_COLOR_VALUES = ["0", "1", "2", "3", "4", "5"] as const;

export function crosshairColorLabel(color: string | undefined, t: TFunction): string {
  if (color === undefined) return "—";
  const key = CROSSHAIR_COLOR_KEYS[color];
  return key ? t(key) : color;
}

export function crosshairColorOptions(t: TFunction): { value: string; label: string }[] {
  return CROSSHAIR_COLOR_VALUES.map((value) => ({ value, label: crosshairColorLabel(value, t) }));
}

/** Chaves `setting.*` do cs2_video.txt exibidas/editadas como qualidade gráfica (valores numéricos brutos). */
export const VIDEO_QUALITY_KEYS = [
  { key: "setting.csm_quality_level", labelKey: "detail.video.quality.shadows" },
  { key: "setting.gpu_mem_level", labelKey: "detail.video.quality.textures" },
  { key: "setting.r_texturefilteringquality", labelKey: "detail.video.quality.textureFiltering" },
  { key: "setting.r_particle_max_detail_level", labelKey: "detail.video.quality.particles" },
  { key: "setting.r_ssao", labelKey: "detail.video.quality.ao" },
  { key: "setting.sc_hdr_enabled_override", labelKey: "detail.video.quality.hdr" },
  { key: "setting.r_csgo_fsr_upsample", labelKey: "detail.video.quality.fsr" },
  { key: "setting.shaderquality", labelKey: "detail.video.quality.shader" },
] as const;

/** Booleanos aparecem como "true"/"false" (convars) ou "1"/"0" (vídeo) dependendo do arquivo. */
export function boolLabel(value: string | undefined, t: TFunction): string {
  if (value === "true" || value === "1") return t("common.on");
  if (value === "false" || value === "0") return t("common.off");
  return value ?? "—";
}

export function reflexLabel(value: string | undefined, t: TFunction): string {
  if (value === "0") return t("common.off");
  if (value === "1") return t("common.on");
  if (value === "2") return t("detail.video.reflexBoost");
  return value ?? "—";
}
