//! Tipos serde do contrato JSON com o frontend.
//!
//! Port de `web/src/server/steam/types.ts`: os campos serializam em camelCase
//! e na mesma ordem declarada no TS. Única diferença do contrato original:
//! `avatarUrl` virou `hasLocalAvatar: bool` (o app desktop lê o avatar do
//! avatarcache local via comando `get_avatar` em vez de expor uma URL de API).

use indexmap::IndexMap;
use serde::{Deserialize, Serialize};

/// Os 4 arquivos de config gerenciados. Nomes/valores idênticos ao TS.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ConfigTarget {
    Video,
    Convars,
    Binds,
    Machine,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SteamPathSource {
    Override,
    Env,
    Auto,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SteamPathInfo {
    pub path: Option<String>,
    pub source: Option<SteamPathSource>,
    pub libraries: Vec<String>,
    pub cs2_cfg_dir: Option<String>,
    pub steam_running: bool,
    pub cs2_running: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SteamAccountSummary {
    pub account_id: String,
    pub steam_id64: String,
    pub persona_name: Option<String>,
    pub account_name: Option<String>,
    pub last_login_timestamp: Option<i64>,
    pub is_auto_login: bool,
    pub is_most_recent: bool,
    pub has_local_profile: bool,
    /// Substitui `avatarUrl` do TS.
    pub has_local_avatar: bool,
    pub last_modified: Option<String>,
    pub file_count: u32,
    pub bind_count: u32,
    pub convar_count: u32,
    pub resolution: Option<String>,
    pub display_mode: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountBrief {
    pub account_id: String,
    pub steam_id64: String,
    pub persona_name: Option<String>,
    pub account_name: Option<String>,
    /// Substitui `avatarUrl` do TS.
    pub has_local_avatar: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct KeyBind {
    pub key: String,
    pub command: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreenshotInfo {
    pub name: String,
    pub size: u64,
    pub mtime: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ConfigFileInfo {
    pub target: ConfigTarget,
    pub name: String,
    pub size: u64,
    pub mtime: String,
}

/// Conteúdo bruto dos 4 arquivos (`null` quando ausente) — equivalente ao
/// `Record<ConfigTarget, string | null>` do TS, com as 4 chaves sempre presentes.
#[derive(Debug, Clone, Serialize)]
pub struct RawConfigFiles {
    pub video: Option<String>,
    pub convars: Option<String>,
    pub binds: Option<String>,
    pub machine: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountConfig {
    pub video: IndexMap<String, String>,
    pub convars: IndexMap<String, String>,
    pub binds: Vec<KeyBind>,
    pub machine_convars: IndexMap<String, String>,
    pub raw: RawConfigFiles,
    pub files: Vec<ConfigFileInfo>,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConvarGroups {
    pub crosshair: IndexMap<String, String>,
    pub viewmodel: IndexMap<String, String>,
    pub mouse: IndexMap<String, String>,
    pub radar_hud: IndexMap<String, String>,
    pub buymenu: IndexMap<String, String>,
    pub others: IndexMap<String, String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum DiffStatus {
    Same,
    Different,
    OnlyA,
    OnlyB,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffEntry {
    pub key: String,
    pub a_value: Option<String>,
    pub b_value: Option<String>,
    pub status: DiffStatus,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffGroup {
    pub id: String,
    pub label: String,
    pub entries: Vec<DiffEntry>,
    pub diff_count: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct DiffResult {
    pub a: AccountBrief,
    pub b: AccountBrief,
    pub groups: Vec<DiffGroup>,
}

#[derive(Debug, Clone, Serialize)]
pub struct BackupFileInfo {
    pub name: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    pub backup_id: String,
    pub created_at: String,
    pub files: Vec<BackupFileInfo>,
}

/// Seções do transfer — todas opcionais, default `false` (como o schema zod do TS).
#[derive(Debug, Clone, Copy, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct TransferSections {
    pub video: bool,
    pub convars: bool,
    pub binds: bool,
    pub machine: bool,
}

impl TransferSections {
    pub fn any(&self) -> bool {
        self.video || self.convars || self.binds || self.machine
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferResult {
    pub copied: Vec<String>,
    pub backup_id: Option<String>,
}

// ---- Wrappers de resposta dos comandos (formas definidas pelo plano) ----

#[derive(Debug, Clone, Serialize)]
pub struct AccountConfigResponse {
    pub account: SteamAccountSummary,
    pub config: AccountConfig,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateResult {
    pub updated: u32,
    pub backup_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RawResult {
    pub saved: bool,
    pub backup_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBackupResult {
    pub backup_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreResult {
    pub restored: bool,
    pub backup_id: Option<String>,
}
