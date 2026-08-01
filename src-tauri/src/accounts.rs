//! Enumeração das contas Steam com config de CS2.
//!
//! Port de `web/src/server/steam/accounts.ts`: `config/loginusers.vdf` +
//! scan de `userdata/<id>/730/local/cfg` + stats leves dos 4 arquivos.
//! Diferença de contrato: `hasLocalAvatar` (existe arquivo em
//! `config/avatarcache/<steamid64>.png|.jpg|.jpeg`) no lugar de `avatarUrl`.

use crate::config_files::flatten_leaf;
use crate::error::AppError;
use crate::steam_ids::account_id_to_steam_id64;
use crate::steam_locator;
use crate::types::{AccountBrief, ConfigTarget, SteamAccountSummary};
use crate::util::{read_text_lossy, system_time_to_iso};
use crate::vdf::{parse_vdf, VdfValue};
use indexmap::IndexMap;
use std::cmp::Ordering;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

#[derive(Debug, Default)]
struct LoginUser {
    account_name: Option<String>,
    persona_name: Option<String>,
    timestamp: Option<i64>,
    auto_login: bool,
}

fn require_steam_path(data_dir: &Path) -> Result<String, AppError> {
    let (steam_path, _) = steam_locator::resolve_steam_path(data_dir);
    steam_path.ok_or_else(AppError::steam_not_found)
}

/// Lê `config/loginusers.vdf` indexado por steamID64.
fn read_login_users(steam_path: &str) -> HashMap<String, LoginUser> {
    let mut users = HashMap::new();
    let raw = match read_text_lossy(&Path::new(steam_path).join("config").join("loginusers.vdf")) {
        Ok(raw) => raw,
        Err(_) => return users, // loginusers ausente/ilegível — segue sem perfis
    };
    let parsed = parse_vdf(&raw);
    let Some(VdfValue::Object(root)) = parsed.get("users") else {
        return users;
    };
    for (steam_id64, entry) in root.iter() {
        let VdfValue::Object(entry) = entry else {
            continue;
        };
        let get_str = |key: &str| match entry.get(key) {
            Some(VdfValue::Str(value)) => Some(value.clone()),
            _ => None,
        };
        let timestamp = get_str("Timestamp").and_then(|raw| raw.parse::<i64>().ok());
        users.insert(
            steam_id64.clone(),
            LoginUser {
                account_name: get_str("AccountName"),
                persona_name: get_str("PersonaName"),
                timestamp,
                auto_login: get_str("AutoLogin").as_deref() == Some("1"),
            },
        );
    }
    users
}

#[derive(Debug, Default)]
struct AccountFileStats {
    file_count: u32,
    last_modified: Option<String>,
    bind_count: u32,
    convar_count: u32,
    resolution: Option<String>,
    display_mode: Option<String>,
}

fn display_mode_from_video(video: &IndexMap<String, String>) -> Option<&'static str> {
    let fullscreen = video.get("setting.fullscreen");
    let no_border = video.get("setting.nowindowborder");
    if fullscreen.is_none() && no_border.is_none() {
        return None;
    }
    if fullscreen.map(String::as_str) == Some("1") {
        return Some("Tela cheia");
    }
    if no_border.map(String::as_str) == Some("1") {
        return Some("Janela sem borda");
    }
    Some("Janela")
}

/// Parse leve dos 4 arquivos de config da conta para estatísticas do card.
fn read_account_stats(cfg_dir: &Path) -> AccountFileStats {
    let mut file_count = 0u32;
    let mut last_modified: Option<SystemTime> = None;
    let mut bind_count = 0u32;
    let mut convar_count = 0u32;
    let mut resolution: Option<String> = None;
    let mut display_mode: Option<&'static str> = None;

    for target in ConfigTarget::ALL {
        let file_path = cfg_dir.join(target.file_name());
        let stat = match fs::metadata(&file_path) {
            Ok(stat) => stat,
            Err(_) => continue,
        };
        file_count += 1;
        if let Ok(mtime) = stat.modified() {
            last_modified = Some(match last_modified {
                Some(current) if current >= mtime => current,
                _ => mtime,
            });
        }
        let raw = match read_text_lossy(&file_path) {
            Ok(raw) => raw,
            Err(_) => continue,
        };

        // parse_vdf é tolerante (não falha) — arquivo malformado → stats parciais
        let parsed = parse_vdf(&raw);
        match target {
            ConfigTarget::Video => {
                let video = flatten_leaf(&parsed, &["video.cfg"]);
                if let (Some(width), Some(height)) =
                    (video.get("setting.defaultres"), video.get("setting.defaultresheight"))
                {
                    resolution = Some(format!("{width}x{height}"));
                }
                display_mode = display_mode_from_video(&video);
            }
            ConfigTarget::Binds => {
                bind_count = flatten_leaf(&parsed, &["config", "bindings"]).len() as u32;
            }
            ConfigTarget::Convars | ConfigTarget::Machine => {
                convar_count += flatten_leaf(&parsed, &["config", "convars"]).len() as u32;
            }
        }
    }

    AccountFileStats {
        file_count,
        last_modified: last_modified.map(system_time_to_iso),
        bind_count,
        convar_count,
        resolution,
        display_mode: display_mode.map(String::from),
    }
}

fn build_brief(
    steam_path: Option<&str>,
    account_id: &str,
    steam_id64: &str,
    user: Option<&LoginUser>,
) -> AccountBrief {
    AccountBrief {
        account_id: account_id.to_string(),
        steam_id64: steam_id64.to_string(),
        persona_name: user.and_then(|u| u.persona_name.clone()),
        account_name: user.and_then(|u| u.account_name.clone()),
        has_local_avatar: steam_path
            .and_then(|path| resolve_avatar_path(path, steam_id64))
            .is_some(),
    }
}

/// Lista as contas com config de CS2 (`userdata/<id>/730/local/cfg`).
/// Erro `steam_not_found` se a Steam não foi detectada.
pub fn list_accounts(data_dir: &Path) -> Result<Vec<SteamAccountSummary>, AppError> {
    let steam_path = require_steam_path(data_dir)?;
    let login_users = read_login_users(&steam_path);

    let most_recent_timestamp = login_users
        .values()
        .filter_map(|user| user.timestamp)
        .max()
        .unwrap_or(0);

    let mut accounts: Vec<SteamAccountSummary> = Vec::new();
    for entry in fs::read_dir(Path::new(&steam_path).join("userdata"))? {
        let entry = entry?;
        if !entry.file_type()?.is_dir() {
            continue;
        }
        let account_id = entry.file_name().to_string_lossy().into_owned();
        if account_id.is_empty() || !account_id.bytes().all(|b| b.is_ascii_digit()) {
            continue;
        }
        let cfg_dir = Path::new(&steam_path)
            .join("userdata")
            .join(&account_id)
            .join("730")
            .join("local")
            .join("cfg");
        if !cfg_dir.exists() {
            continue;
        }

        let steam_id64 = account_id_to_steam_id64(&account_id)?;
        let user = login_users.get(&steam_id64);
        let stats = read_account_stats(&cfg_dir);
        let brief = build_brief(Some(&steam_path), &account_id, &steam_id64, user);

        accounts.push(SteamAccountSummary {
            account_id: brief.account_id,
            steam_id64: brief.steam_id64,
            persona_name: brief.persona_name,
            account_name: brief.account_name,
            last_login_timestamp: user.and_then(|u| u.timestamp),
            is_auto_login: user.map(|u| u.auto_login).unwrap_or(false),
            is_most_recent: user
                .and_then(|u| u.timestamp)
                .map(|t| t == most_recent_timestamp && most_recent_timestamp > 0)
                .unwrap_or(false),
            has_local_profile: user.is_some(),
            has_local_avatar: brief.has_local_avatar,
            last_modified: stats.last_modified,
            file_count: stats.file_count,
            bind_count: stats.bind_count,
            convar_count: stats.convar_count,
            resolution: stats.resolution,
            display_mode: stats.display_mode,
        });
    }

    // Perfis conhecidos por Timestamp desc; desconhecidos ao final, por lastModified desc.
    accounts.sort_by(|a, b| match (a.has_local_profile, b.has_local_profile) {
        (true, false) => Ordering::Less,
        (false, true) => Ordering::Greater,
        (true, true) => b
            .last_login_timestamp
            .unwrap_or(0)
            .cmp(&a.last_login_timestamp.unwrap_or(0)),
        (false, false) => b.last_modified.cmp(&a.last_modified),
    });

    Ok(accounts)
}

pub fn get_account(data_dir: &Path, account_id: &str) -> Result<Option<SteamAccountSummary>, AppError> {
    Ok(list_accounts(data_dir)?
        .into_iter()
        .find(|account| account.account_id == account_id))
}

/// Versão enxuta da conta para respostas de diff.
pub fn get_account_brief(data_dir: &Path, account_id: &str) -> Result<AccountBrief, AppError> {
    let steam_id64 = account_id_to_steam_id64(account_id)?;
    let (steam_path, _) = steam_locator::resolve_steam_path(data_dir);
    let login_users = steam_path.as_deref().map(read_login_users).unwrap_or_default();
    let user = login_users.get(&steam_id64);
    Ok(build_brief(
        steam_path.as_deref(),
        account_id,
        &steam_id64,
        user,
    ))
}

/// Avatar local em `config/avatarcache/<steamId64>.(png|jpg|jpeg)`, se existir.
pub fn resolve_avatar_path(steam_path: &str, steam_id64: &str) -> Option<PathBuf> {
    for ext in ["png", "jpg", "jpeg"] {
        let file_path = Path::new(steam_path)
            .join("config")
            .join("avatarcache")
            .join(format!("{steam_id64}.{ext}"));
        if file_path.exists() {
            return Some(file_path);
        }
    }
    None
}
