import { invoke } from "@tauri-apps/api/core";

import { toApiError } from "./errors";
import type {
  AccountConfigResponse,
  BackupInfo,
  ConfigTarget,
  CreateBackupResult,
  DiffResult,
  RestoreBackupResult,
  SteamAccountSummary,
  SteamPathInfo,
  TransferResult,
  TransferSections,
  UpdateConfigKeysResult,
  WriteRawFileResult,
} from "./types";

/**
 * Typed wrappers over the Tauri commands exposed by src-tauri.
 * Command names are snake_case; invoke args are camelCase (Tauri v2 converts
 * them to snake_case for the Rust handlers). Rejections arrive as
 * `{ code, message }` and are normalized to `ApiError` (see ./errors.ts).
 */
async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (err) {
    throw toApiError(err);
  }
}

export function getSteamPathInfo(): Promise<SteamPathInfo> {
  return call("get_steam_path_info");
}

export function setSteamPathOverride(path: string): Promise<SteamPathInfo> {
  return call("set_steam_path_override", { path });
}

export function clearSteamPathOverride(): Promise<SteamPathInfo> {
  return call("clear_steam_path_override");
}

export function listAccounts(): Promise<SteamAccountSummary[]> {
  return call("list_accounts");
}

export function getAccountConfig(accountId: string): Promise<AccountConfigResponse> {
  return call("get_account_config", { accountId });
}

export function openCfgFolder(accountId: string): Promise<void> {
  return call("open_cfg_folder", { accountId });
}

export function updateConfigKeys(
  accountId: string,
  target: ConfigTarget,
  changes: Record<string, string>,
  deleteKeys?: string[],
): Promise<UpdateConfigKeysResult> {
  return call("update_config_keys", { accountId, target, changes, deleteKeys });
}

export function writeRawFile(accountId: string, target: ConfigTarget, content: string): Promise<WriteRawFileResult> {
  return call("write_raw_file", { accountId, target, content });
}

export function listBackups(accountId: string): Promise<BackupInfo[]> {
  return call("list_backups", { accountId });
}

export function createBackup(accountId: string): Promise<CreateBackupResult> {
  return call("create_backup", { accountId });
}

export function restoreBackup(accountId: string, backupId: string): Promise<RestoreBackupResult> {
  return call("restore_backup", { accountId, backupId });
}

export function transferConfigs(fromId: string, toId: string, sections: TransferSections): Promise<TransferResult> {
  return call("transfer_configs", { fromId, toId, sections });
}

export function diffAccounts(aId: string, bId: string): Promise<DiffResult> {
  return call("diff_accounts", { aId, bId });
}

/** Local avatar bytes (from the Steam avatarcache), or null when unavailable. */
export function getAvatar(accountId: string): Promise<number[] | null> {
  return call("get_avatar", { accountId });
}

/** Remote avatar URL resolved from the Steam profile, or null when unavailable. */
export function getAvatarUrl(steamId64: string): Promise<string | null> {
  return call("get_avatar_url", { steamId64 });
}
