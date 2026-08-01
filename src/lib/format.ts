import { format, formatDistanceToNow } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";

import i18n from "@/i18n";

/**
 * Date formatting follows the ACTIVE i18n language (i18next `language`),
 * not a hardcoded locale — the web app these helpers were ported from
 * used pt-BR unconditionally. Callers just call the functions; the locale
 * is resolved at call time, so language switches apply on re-render.
 */
function activeDateLocale() {
  return i18n.language?.toLowerCase().startsWith("pt") ? ptBR : enUS;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDateTime(iso: string): string {
  // "PPp" is a locale-aware long-date + short-time pattern (no hardcoded words).
  return format(new Date(iso), "PPp", { locale: activeDateLocale() });
}

export function formatRelativeDate(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: activeDateLocale() });
}
