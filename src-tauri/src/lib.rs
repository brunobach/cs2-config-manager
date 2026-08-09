//! Backend Tauri v2 do CS2 Config Manager.
//!
//! Expõe como comandos Tauri a mesma lógica das rotas `/api/cs2/*` do backend
//! web (portada dos módulos `web/src/server/steam/*`). Os comandos são `async`
//! para rodar fora da thread principal; o contrato JSON é idêntico ao do TS
//! (camelCase), exceto `avatarUrl` → `hasLocalAvatar`.

mod accounts;
mod avatar;
mod config_files;
mod diff;
mod error;
mod groups;
mod settings;
mod steam_ids;
mod steam_locator;
mod transfer;
mod types;
mod util;
mod vdf;

use crate::error::AppError;
use crate::types::{
    AccountConfigResponse, BackupInfo, CreateBackupResult, DiffResult, RawResult, RestoreResult,
    SteamAccountSummary, SteamPathInfo, TransferResult, TransferSections, UpdateResult,
};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tauri::Manager;

/// Estado compartilhado: `app_data_dir` resolvido uma única vez no setup.
/// Settings (`settings.json`) e backups (`cs2-backups/`) moram dentro dele.
pub struct AppState {
    pub data_dir: PathBuf,
}

fn parse_target(target: &str) -> Result<types::ConfigTarget, AppError> {
    match target {
        "video" => Ok(types::ConfigTarget::Video),
        "convars" => Ok(types::ConfigTarget::Convars),
        "binds" => Ok(types::ConfigTarget::Binds),
        "machine" => Ok(types::ConfigTarget::Machine),
        _ => Err(AppError::invalid_input(format!("Alvo inválido: \"{target}\""))),
    }
}

/// Guard contra path traversal em operações que montam paths com o accountId.
fn require_digits(account_id: &str) -> Result<(), AppError> {
    if account_id.is_empty() || !account_id.bytes().all(|b| b.is_ascii_digit()) {
        return Err(AppError::invalid_input(format!(
            "Conta inválida: \"{account_id}\""
        )));
    }
    Ok(())
}

#[tauri::command]
async fn get_steam_path_info(state: tauri::State<'_, AppState>) -> Result<SteamPathInfo, AppError> {
    Ok(steam_locator::get_steam_path_info(&state.data_dir))
}

#[tauri::command]
async fn set_steam_path_override(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<SteamPathInfo, AppError> {
    let trimmed = path.trim();
    // Caminho vazio limpa o override — resolve_steam_path() cai na detecção automática.
    if trimmed.is_empty() {
        settings::clear_setting(&state.data_dir, steam_locator::STEAM_PATH_OVERRIDE_KEY)?;
        return Ok(steam_locator::get_steam_path_info(&state.data_dir));
    }

    let dir = Path::new(trimmed);
    if !dir.is_dir() {
        return Err(AppError::invalid_path(format!(
            "Pasta inválida: \"{trimmed}\" não existe"
        )));
    }
    if !dir.join("userdata").exists() {
        return Err(AppError::invalid_path(format!(
            "Pasta inválida: \"{trimmed}\" não tem subpasta userdata (não parece uma instalação da Steam)"
        )));
    }

    settings::set_setting(&state.data_dir, steam_locator::STEAM_PATH_OVERRIDE_KEY, trimmed)?;
    Ok(steam_locator::get_steam_path_info(&state.data_dir))
}

#[tauri::command]
async fn clear_steam_path_override(
    state: tauri::State<'_, AppState>,
) -> Result<SteamPathInfo, AppError> {
    settings::clear_setting(&state.data_dir, steam_locator::STEAM_PATH_OVERRIDE_KEY)?;
    Ok(steam_locator::get_steam_path_info(&state.data_dir))
}

#[tauri::command]
async fn list_accounts(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<SteamAccountSummary>, AppError> {
    accounts::list_accounts(&state.data_dir)
}

#[tauri::command]
async fn get_account_config(
    state: tauri::State<'_, AppState>,
    account_id: String,
) -> Result<AccountConfigResponse, AppError> {
    let account = accounts::get_account(&state.data_dir, &account_id)?
        .ok_or_else(|| AppError::account_not_found(format!("Conta {account_id} não encontrada")))?;
    let config = config_files::read_account_config(&state.data_dir, &account_id)?;
    Ok(AccountConfigResponse { account, config })
}

/// Abre a pasta cfg da conta no Explorer. O exit code do `explorer` não é
/// checado (retorna não-zero mesmo em sucesso) — só falha de spawn vira erro.
#[tauri::command]
async fn open_cfg_folder(
    state: tauri::State<'_, AppState>,
    account_id: String,
) -> Result<(), AppError> {
    let dir = config_files::account_cfg_dir(&state.data_dir, &account_id)?;
    std::process::Command::new("explorer").arg(&dir).spawn()?;
    Ok(())
}

#[tauri::command]
async fn update_config_keys(
    state: tauri::State<'_, AppState>,
    account_id: String,
    target: String,
    changes: HashMap<String, String>,
    delete_keys: Option<Vec<String>>,
) -> Result<UpdateResult, AppError> {
    let target = parse_target(&target)?;
    let (updated, backup_id) = config_files::update_config_keys(
        &state.data_dir,
        &account_id,
        target,
        &changes,
        delete_keys.as_deref().unwrap_or(&[]),
    )?;
    Ok(UpdateResult { updated, backup_id })
}

#[tauri::command]
async fn write_raw_file(
    state: tauri::State<'_, AppState>,
    account_id: String,
    target: String,
    content: String,
) -> Result<RawResult, AppError> {
    let target = parse_target(&target)?;
    let backup_id = config_files::write_raw_file(&state.data_dir, &account_id, target, &content)?;
    Ok(RawResult {
        saved: true,
        backup_id,
    })
}

#[tauri::command]
async fn list_backups(
    state: tauri::State<'_, AppState>,
    account_id: String,
) -> Result<Vec<BackupInfo>, AppError> {
    require_digits(&account_id)?;
    config_files::list_backups(&state.data_dir, &account_id)
}

#[tauri::command]
async fn create_backup(
    state: tauri::State<'_, AppState>,
    account_id: String,
) -> Result<CreateBackupResult, AppError> {
    let backup_id = config_files::create_backup(&state.data_dir, &account_id)?;
    Ok(CreateBackupResult { backup_id })
}

#[tauri::command]
async fn restore_backup(
    state: tauri::State<'_, AppState>,
    account_id: String,
    backup_id: String,
) -> Result<RestoreResult, AppError> {
    let pre_restore_backup_id =
        config_files::restore_backup(&state.data_dir, &account_id, &backup_id)?;
    Ok(RestoreResult {
        restored: true,
        backup_id: pre_restore_backup_id,
    })
}

#[tauri::command]
async fn transfer_configs(
    state: tauri::State<'_, AppState>,
    from_id: String,
    to_id: String,
    sections: TransferSections,
) -> Result<TransferResult, AppError> {
    if !sections.any() {
        return Err(AppError::invalid_input(
            "Selecione ao menos uma seção para transferir",
        ));
    }
    transfer::transfer_configs(&state.data_dir, &from_id, &to_id, &sections)
}

#[tauri::command]
async fn diff_accounts(
    state: tauri::State<'_, AppState>,
    a_id: String,
    b_id: String,
) -> Result<DiffResult, AppError> {
    diff::diff_accounts(&state.data_dir, &a_id, &b_id)
}

/// Bytes do avatar local (`config/avatarcache`), `null` quando não existe.
#[tauri::command]
async fn get_avatar(
    state: tauri::State<'_, AppState>,
    account_id: String,
) -> Result<Option<Vec<u8>>, AppError> {
    Ok(avatar::get_avatar_bytes(&state.data_dir, &account_id))
}

/// URL remota do avatar (fallback de rede). Erros de rede viram `null`.
#[tauri::command]
async fn get_avatar_url(steam_id64: String) -> Result<Option<String>, AppError> {
    let result = tauri::async_runtime::spawn_blocking(move || avatar::fetch_avatar_url(&steam_id64))
        .await
        .unwrap_or(None);
    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("falha ao resolver o app_data_dir");
            std::fs::create_dir_all(&data_dir).expect("falha ao criar o app_data_dir");
            app.manage(AppState { data_dir });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_steam_path_info,
            set_steam_path_override,
            clear_steam_path_override,
            list_accounts,
            get_account_config,
            open_cfg_folder,
            update_config_keys,
            write_raw_file,
            list_backups,
            create_backup,
            restore_backup,
            transfer_configs,
            diff_accounts,
            get_avatar,
            get_avatar_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
