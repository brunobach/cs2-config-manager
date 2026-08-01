/**
 * Contract of the Tauri commands (src-tauri) consumed via `src/lib/api.ts`.
 * Ported from the web app's `src/server/steam/types.ts` with one change:
 * `avatarUrl: string` became `hasLocalAvatar: boolean` on SteamAccountSummary
 * and AccountBrief — avatars are now resolved by the frontend through the
 * `get_avatar` (local bytes) / `get_avatar_url` (remote URL) commands,
 * falling back to a generated dicebear avatar.
 */

export type ConfigTarget = "video" | "convars" | "binds" | "machine";

export type SteamPathSource = "override" | "env" | "auto" | null;

export interface SteamPathInfo {
  path: string | null;
  source: SteamPathSource;
  libraries: string[];
  cs2CfgDir: string | null;
  steamRunning: boolean;
  cs2Running: boolean;
}

export interface SteamAccountSummary {
  accountId: string;
  steamId64: string;
  personaName: string | null;
  accountName: string | null;
  lastLoginTimestamp: number | null;
  isAutoLogin: boolean;
  isMostRecent: boolean;
  hasLocalProfile: boolean;
  hasLocalAvatar: boolean;
  lastModified: string | null;
  fileCount: number;
  bindCount: number;
  convarCount: number;
  resolution: string | null;
  displayMode: string | null;
}

export interface AccountBrief {
  accountId: string;
  steamId64: string;
  personaName: string | null;
  accountName: string | null;
  hasLocalAvatar: boolean;
}

export interface KeyBind {
  key: string;
  command: string;
}

export interface ConfigFileInfo {
  target: ConfigTarget;
  name: string;
  size: number;
  mtime: string;
}

export interface AccountConfig {
  video: Record<string, string>;
  convars: Record<string, string>;
  binds: KeyBind[];
  machineConvars: Record<string, string>;
  raw: Record<ConfigTarget, string | null>;
  files: ConfigFileInfo[];
}

export interface ConvarGroups {
  crosshair: Record<string, string>;
  viewmodel: Record<string, string>;
  mouse: Record<string, string>;
  radarHud: Record<string, string>;
  buymenu: Record<string, string>;
  others: Record<string, string>;
}

export type DiffStatus = "same" | "different" | "only-a" | "only-b";

export interface DiffEntry {
  key: string;
  aValue: string | null;
  bValue: string | null;
  status: DiffStatus;
}

export interface DiffGroup {
  id: string;
  label: string;
  entries: DiffEntry[];
  diffCount: number;
}

export interface DiffResult {
  a: AccountBrief;
  b: AccountBrief;
  groups: DiffGroup[];
}

export interface BackupFileInfo {
  name: string;
  size: number;
}

export interface BackupInfo {
  backupId: string;
  createdAt: string;
  files: BackupFileInfo[];
}

export interface TransferSections {
  video?: boolean;
  convars?: boolean;
  binds?: boolean;
  machine?: boolean;
}

export interface TransferResult {
  copied: string[];
  backupId: string | null;
}

/* Command response envelopes (mirrors the old /api/cs2 route responses). */

export interface AccountConfigResponse {
  account: SteamAccountSummary;
  config: AccountConfig;
}

export interface UpdateConfigKeysResult {
  updated: number;
  backupId: string | null;
}

export interface WriteRawFileResult {
  saved: boolean;
  backupId: string | null;
}

export interface CreateBackupResult {
  backupId: string | null;
}

export interface RestoreBackupResult {
  restored: boolean;
  backupId: string | null;
}
