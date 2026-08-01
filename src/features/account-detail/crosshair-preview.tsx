import { useEffect, useRef } from "react";

import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 240;
const SCALE = 4;

/** Mapeamento de `cl_crosshaircolor` usado pela comunidade (0-4 presets, 5 = RGB custom). */
const COLOR_PRESETS: Record<string, readonly [number, number, number]> = {
  "0": [255, 0, 0],
  "1": [0, 255, 0],
  "2": [255, 255, 0],
  "3": [0, 0, 255],
  "4": [0, 255, 255],
};

function num(convars: Record<string, string>, key: string, fallback: number): number {
  const value = Number.parseFloat(convars[key] ?? "");
  return Number.isFinite(value) ? value : fallback;
}

interface CrosshairPreviewProps {
  convars: Record<string, string>;
  className?: string;
}

export function CrosshairPreview({ convars, className }: CrosshairPreviewProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const size = num(convars, "cl_crosshairsize", 5) * SCALE;
  const gap = num(convars, "cl_crosshairgap", 0) * SCALE;
  const thickness = Math.max(1, num(convars, "cl_crosshairthickness", 1) * SCALE);
  const dot = convars.cl_crosshairdot === "true";
  const outline = convars.cl_crosshair_drawoutline === "true";
  const outlineThickness = Math.max(0, num(convars, "cl_crosshairoutlinethickness", 1));
  const useAlpha = convars.cl_crosshairusealpha === "true";
  const alpha = useAlpha ? Math.min(255, Math.max(0, num(convars, "cl_crosshairalpha", 255))) / 255 : 1;
  const colorKey = convars.cl_crosshaircolor ?? "1";
  const [r, g, b] =
    colorKey === "5"
      ? ([
          Math.min(255, Math.max(0, num(convars, "cl_crosshaircolor_r", 255))),
          Math.min(255, Math.max(0, num(convars, "cl_crosshaircolor_g", 255))),
          Math.min(255, Math.max(0, num(convars, "cl_crosshaircolor_b", 255))),
        ] as const)
      : (COLOR_PRESETS[colorKey] ?? COLOR_PRESETS["1"]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // Fundo: gradiente escuro estilo "parede de mapa" + grid sutil
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, "#1b2838");
    gradient.addColorStop(1, "#0f1419");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 20; x < CANVAS_WIDTH; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 20; y < CANVAS_HEIGHT; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;

    // 4 linhas estáticas: [x, y, w, h] — a borda interna começa a `gap` do centro
    const lines: [number, number, number, number][] = [
      [cx - thickness / 2, cy - gap - size, thickness, size], // cima
      [cx - thickness / 2, cy + gap, thickness, size], // baixo
      [cx - gap - size, cy - thickness / 2, size, thickness], // esquerda
      [cx + gap, cy - thickness / 2, size, thickness], // direita
    ];

    if (outline && outlineThickness > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      for (const [x, y, w, h] of lines) {
        ctx.fillRect(x - outlineThickness, y - outlineThickness, w + outlineThickness * 2, h + outlineThickness * 2);
      }
      if (dot) {
        ctx.beginPath();
        ctx.arc(cx, cy, thickness / 2 + outlineThickness, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    for (const [x, y, w, h] of lines) {
      ctx.fillRect(x, y, w, h);
    }
    if (dot) {
      ctx.beginPath();
      ctx.arc(cx, cy, thickness / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [size, gap, thickness, dot, outline, outlineThickness, alpha, r, g, b]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full rounded-lg border border-border", className)}
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
      aria-label={t("crosshair.previewAria")}
      role="img"
    />
  );
}
