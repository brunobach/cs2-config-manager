//! Leitura/escrita dos 4 arquivos de config por conta, com backups.
//!
//! Port de `web/src/server/steam/config-files.ts`. Backups moram em
//! `<app_data_dir>/cs2-backups/<accountId>/<backupId>` e são feitos ANTES de
//! qualquer escrita. Escrita atômica via arquivo tmp + rename.

use crate::error::AppError;
use crate::steam_locator;
use crate::types::{AccountConfig, BackupFileInfo, BackupInfo, ConfigFileInfo, ConfigTarget, KeyBind, RawConfigFiles};
use crate::util::{locale_compare, now_iso_utc, read_text_lossy, rename_replace, system_time_to_iso};
use crate::vdf::{parse_vdf, serialize_vdf, VdfObject, VdfValue};
use indexmap::IndexMap;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

impl ConfigTarget {
    /// `CONFIG_FILES` do TS.
    pub const ALL: [ConfigTarget; 4] = [
        ConfigTarget::Video,
        ConfigTarget::Convars,
        ConfigTarget::Binds,
        ConfigTarget::Machine,
    ];

    pub fn file_name(self) -> &'static str {
        match self {
            ConfigTarget::Video => "cs2_video.txt",
            ConfigTarget::Convars => "cs2_user_convars_0_slot0.vcfg",
            ConfigTarget::Binds => "cs2_user_keys_0_slot0.vcfg",
            ConfigTarget::Machine => "cs2_machine_convars.vcfg",
        }
    }

    /// `FILE_STRUCTURE` do TS: root KeyValues e sub-bloco (quando houver).
    pub fn structure(self) -> (&'static str, Option<&'static str>) {
        match self {
            ConfigTarget::Video => ("video.cfg", None),
            ConfigTarget::Convars => ("config", Some("convars")),
            ConfigTarget::Binds => ("config", Some("bindings")),
            ConfigTarget::Machine => ("config", Some("convars")),
        }
    }
}

pub fn backups_root_dir(data_dir: &Path, account_id: &str) -> PathBuf {
    data_dir.join("cs2-backups").join(account_id)
}

/// Resolve a pasta `userdata/<accountId>/730/local/cfg` — erro se Steam/conta indisponível.
pub fn account_cfg_dir(data_dir: &Path, account_id: &str) -> Result<PathBuf, AppError> {
    if account_id.is_empty() || !account_id.bytes().all(|b| b.is_ascii_digit()) {
        return Err(AppError::invalid_input(format!("Conta inválida: \"{account_id}\"")));
    }
    let (steam_path, _) = steam_locator::resolve_steam_path(data_dir);
    let Some(steam_path) = steam_path else {
        return Err(AppError::steam_not_found());
    };
    let dir = Path::new(&steam_path)
        .join("userdata")
        .join(account_id)
        .join("730")
        .join("local")
        .join("cfg");
    if !dir.exists() {
        return Err(AppError::account_not_found(format!(
            "Conta {account_id} sem pasta de config do CS2"
        )));
    }
    Ok(dir)
}

/// Extrai os pares chave→valor (somente folhas string) de um caminho dentro do objeto VDF.
pub fn flatten_leaf(obj: &VdfObject, segments: &[&str]) -> IndexMap<String, String> {
    let mut current = obj;
    for segment in segments {
        match current.get(segment) {
            Some(VdfValue::Object(child)) => current = child,
            _ => return IndexMap::new(),
        }
    }
    current
        .iter()
        .filter_map(|(key, value)| match value {
            VdfValue::Str(value) => Some((key.clone(), value.clone())),
            _ => None,
        })
        .collect()
}

fn try_parse_vdf(raw: Option<&str>) -> VdfObject {
    match raw {
        Some(raw) if !raw.is_empty() => parse_vdf(raw),
        _ => VdfObject::new(),
    }
}

/// Escrita atômica: escreve em arquivo temporário no mesmo diretório e renomeia.
pub(crate) fn atomic_write(file_path: &Path, content: &str) -> Result<(), AppError> {
    atomic_write_bytes(file_path, content.as_bytes())
}

pub(crate) fn atomic_write_bytes(file_path: &Path, content: &[u8]) -> Result<(), AppError> {
    let mut tmp_name = file_path
        .file_name()
        .map(|name| name.to_os_string())
        .unwrap_or_default();
    tmp_name.push(format!(".tmp-{}", std::process::id()));
    let tmp_path = file_path.with_file_name(tmp_name);
    fs::write(&tmp_path, content)?;
    rename_replace(&tmp_path, file_path)?;
    Ok(())
}

pub fn read_account_config(data_dir: &Path, account_id: &str) -> Result<AccountConfig, AppError> {
    let dir = account_cfg_dir(data_dir, account_id)?;

    let mut raw = RawConfigFiles {
        video: None,
        convars: None,
        binds: None,
        machine: None,
    };
    let mut files: Vec<ConfigFileInfo> = Vec::new();
    for target in ConfigTarget::ALL {
        let file_path = dir.join(target.file_name());
        let slot = match target {
            ConfigTarget::Video => &mut raw.video,
            ConfigTarget::Convars => &mut raw.convars,
            ConfigTarget::Binds => &mut raw.binds,
            ConfigTarget::Machine => &mut raw.machine,
        };
        match fs::metadata(&file_path).and_then(|stat| {
            read_text_lossy(&file_path).map(|content| (stat, content))
        }) {
            Ok((stat, content)) => {
                *slot = Some(content);
                files.push(ConfigFileInfo {
                    target,
                    name: target.file_name().to_string(),
                    size: stat.len(),
                    mtime: system_time_to_iso(stat.modified().unwrap_or(SystemTime::UNIX_EPOCH)),
                });
            }
            Err(_) => *slot = None,
        }
    }

    let video_parsed = try_parse_vdf(raw.video.as_deref());
    let convars_parsed = try_parse_vdf(raw.convars.as_deref());
    let binds_parsed = try_parse_vdf(raw.binds.as_deref());
    let machine_parsed = try_parse_vdf(raw.machine.as_deref());

    let binds_map = flatten_leaf(&binds_parsed, &["config", "bindings"]);
    let mut binds: Vec<KeyBind> = binds_map
        .into_iter()
        .map(|(key, command)| KeyBind { key, command })
        .collect();
    binds.sort_by(|a, b| locale_compare(&a.key, &b.key));

    Ok(AccountConfig {
        video: flatten_leaf(&video_parsed, &["video.cfg"]),
        convars: flatten_leaf(&convars_parsed, &["config", "convars"]),
        binds,
        machine_convars: flatten_leaf(&machine_parsed, &["config", "convars"]),
        raw,
        files,
    })
}

/// Aplica alterações pontuais em um arquivo de config.
/// - `changes`: pares chave→valor. Para binds, valor `""` vira `"<unbound>"`.
/// - `delete_keys`: remove a chave do arquivo (a convar/bind volta ao padrão do jogo).
/// Cria o arquivo com a estrutura mínima se não existir. Faz backup prévio quando já existia.
pub fn update_config_keys(
    data_dir: &Path,
    account_id: &str,
    target: ConfigTarget,
    changes: &HashMap<String, String>,
    delete_keys: &[String],
) -> Result<(u32, Option<String>), AppError> {
    let dir = account_cfg_dir(data_dir, account_id)?;
    let file_path = dir.join(target.file_name());

    let existed = file_path.exists();
    let raw = if existed {
        Some(read_text_lossy(&file_path)?)
    } else {
        None
    };
    let mut parsed = try_parse_vdf(raw.as_deref());

    let (root_key, sub_key) = target.structure();
    if !matches!(parsed.get(root_key), Some(VdfValue::Object(_))) {
        parsed.insert(root_key.to_string(), VdfValue::Object(VdfObject::new()));
    }
    let root = match parsed.get_mut(root_key) {
        Some(VdfValue::Object(root)) => root,
        _ => unreachable!("root acabou de ser inserido como objeto"),
    };
    let leaf = match sub_key {
        Some(sub_key) => {
            if !matches!(root.get(sub_key), Some(VdfValue::Object(_))) {
                root.insert(sub_key.to_string(), VdfValue::Object(VdfObject::new()));
            }
            match root.get_mut(sub_key) {
                Some(VdfValue::Object(sub)) => sub,
                _ => unreachable!("sub-bloco acabou de ser inserido como objeto"),
            }
        }
        None => &mut *root,
    };

    let mut updated = 0u32;
    for (key, value) in changes {
        let value = if target == ConfigTarget::Binds && value.is_empty() {
            "<unbound>".to_string()
        } else {
            value.clone()
        };
        leaf.insert(key.clone(), VdfValue::Str(value));
        updated += 1;
    }
    for key in delete_keys {
        if leaf.remove(key) {
            updated += 1;
        }
    }

    let backup_id = if existed {
        create_backup(data_dir, account_id)?
    } else {
        None
    };
    atomic_write(&file_path, &serialize_vdf(root_key, root))?;
    Ok((updated, backup_id))
}

/// Sobrescreve um arquivo de config com conteúdo bruto (backup prévio quando já existia).
pub fn write_raw_file(
    data_dir: &Path,
    account_id: &str,
    target: ConfigTarget,
    content: &str,
) -> Result<Option<String>, AppError> {
    let dir = account_cfg_dir(data_dir, account_id)?;
    let file_path = dir.join(target.file_name());

    let backup_id = if file_path.exists() {
        create_backup(data_dir, account_id)?
    } else {
        None
    };
    atomic_write(&file_path, content)?;
    Ok(backup_id)
}

fn new_backup_id() -> String {
    // "2026-07-30T16:05:22.123Z" -> "2026-07-30T16-05-22-123Z" (seguro para nome de pasta)
    now_iso_utc().replace([':', '.'], "-")
}

/// Copia os arquivos de config existentes da conta para
/// `cs2-backups/<accountId>/<backupId>` no `app_data_dir`.
/// Retorna `None` quando não há nenhum arquivo para backupear.
pub fn create_backup(data_dir: &Path, account_id: &str) -> Result<Option<String>, AppError> {
    let src_dir = account_cfg_dir(data_dir, account_id)?;
    let existing: Vec<&'static str> = ConfigTarget::ALL
        .into_iter()
        .map(ConfigTarget::file_name)
        .filter(|name| src_dir.join(name).exists())
        .collect();
    if existing.is_empty() {
        return Ok(None);
    }

    let root = backups_root_dir(data_dir, account_id);
    let mut backup_id = new_backup_id();
    let mut dest_dir = root.join(&backup_id);
    let mut suffix = 2u32;
    while dest_dir.exists() {
        backup_id = format!("{}-{suffix}", new_backup_id());
        dest_dir = root.join(&backup_id);
        suffix += 1;
    }

    fs::create_dir_all(&dest_dir)?;
    for name in existing {
        fs::copy(src_dir.join(name), dest_dir.join(name))?;
    }
    Ok(Some(backup_id))
}

/// Equivalente ao regex do TS:
/// `^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{3}Z(-\d+)?$`
/// (hand-rolled para não puxar o crate `regex` por um único padrão).
fn is_valid_backup_id(backup_id: &str) -> bool {
    // parte principal: "YYYY-MM-DDTHH-MM-SS-mmmZ" = 24 chars
    const MAIN_LEN: usize = 24;
    const DASH_POSITIONS: [usize; 5] = [4, 7, 13, 16, 19];

    let bytes = backup_id.as_bytes();
    let (main, suffix) = match bytes.len() {
        len if len == MAIN_LEN => (backup_id, None),
        len if len > MAIN_LEN + 1 && bytes[MAIN_LEN] == b'-' => {
            (&backup_id[..MAIN_LEN], Some(&backup_id[MAIN_LEN + 1..]))
        }
        _ => return false,
    };

    for (i, byte) in main.bytes().enumerate() {
        let ok = if DASH_POSITIONS.contains(&i) {
            byte == b'-'
        } else if i == 10 {
            byte == b'T'
        } else if i == 23 {
            byte == b'Z'
        } else {
            byte.is_ascii_digit()
        };
        if !ok {
            return false;
        }
    }

    match suffix {
        Some(suffix) => suffix.bytes().all(|b| b.is_ascii_digit()),
        None => true,
    }
}

fn backup_id_to_iso(backup_id: &str) -> String {
    if !is_valid_backup_id(backup_id) {
        return backup_id.to_string();
    }
    format!(
        "{}T{}:{}:{}.{}Z",
        &backup_id[..10],
        &backup_id[11..13],
        &backup_id[14..16],
        &backup_id[17..19],
        &backup_id[20..23]
    )
}

pub fn list_backups(data_dir: &Path, account_id: &str) -> Result<Vec<BackupInfo>, AppError> {
    let root = backups_root_dir(data_dir, account_id);
    let entries = match fs::read_dir(&root) {
        Ok(entries) => entries,
        Err(_) => return Ok(Vec::new()),
    };

    let mut backups: Vec<BackupInfo> = Vec::new();
    for entry in entries.flatten() {
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if !file_type.is_dir() {
            continue;
        }
        let backup_id = entry.file_name().to_string_lossy().into_owned();
        if !is_valid_backup_id(&backup_id) {
            continue;
        }
        let dir = entry.path();
        let files = match fs::read_dir(&dir) {
            Ok(files) => files
                .flatten()
                .filter_map(|file| {
                    let metadata = file.metadata().ok()?;
                    metadata.is_file().then(|| BackupFileInfo {
                        name: file.file_name().to_string_lossy().into_owned(),
                        size: metadata.len(),
                    })
                })
                .collect(),
            Err(_) => Vec::new(),
        };
        backups.push(BackupInfo {
            created_at: backup_id_to_iso(&backup_id),
            backup_id,
            files,
        });
    }
    backups.sort_by(|a, b| b.backup_id.cmp(&a.backup_id));
    Ok(backups)
}

/// Restaura um snapshot: faz backup do estado atual antes e copia os arquivos
/// do snapshot de volta (escrita atômica). Retorna o backupId do estado atual
/// (`None` se não havia nada). Erro `backup_not_found` se o backup não existe.
pub fn restore_backup(
    data_dir: &Path,
    account_id: &str,
    backup_id: &str,
) -> Result<Option<String>, AppError> {
    if !is_valid_backup_id(backup_id) {
        return Err(AppError::invalid_input(format!("Backup inválido: \"{backup_id}\"")));
    }
    let snapshot_dir = backups_root_dir(data_dir, account_id).join(backup_id);
    if !snapshot_dir.exists() {
        return Err(AppError::backup_not_found(format!(
            "Backup {backup_id} não encontrado"
        )));
    }
    let dest_dir = account_cfg_dir(data_dir, account_id)?;

    let pre_restore_backup_id = create_backup(data_dir, account_id)?;

    let valid_names: [&str; 4] = ConfigTarget::ALL.map(ConfigTarget::file_name);
    for entry in fs::read_dir(&snapshot_dir)?.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if !valid_names.contains(&name.as_str()) {
            continue;
        }
        let Ok(file_type) = entry.file_type() else {
            continue;
        };
        if !file_type.is_file() {
            continue;
        }
        let content = fs::read(entry.path())?;
        atomic_write_bytes(&dest_dir.join(&name), &content)?;
    }
    Ok(pre_restore_backup_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn backup_id_validation() {
        assert!(is_valid_backup_id("2026-07-30T16-05-22-123Z"));
        assert!(is_valid_backup_id("2026-07-30T16-05-22-123Z-2"));
        assert!(is_valid_backup_id("2026-07-30T16-05-22-123Z-42"));
        assert!(!is_valid_backup_id("2026-07-30T16:05:22.123Z")); // não sanitizado
        assert!(!is_valid_backup_id("2026-07-30T16-05-22-123")); // sem Z
        assert!(!is_valid_backup_id("2026-07-30T16-05-22-12Z")); // ms curto
        assert!(!is_valid_backup_id("2026-07-30T16-05-22-123Z-")); // sufixo vazio
        assert!(!is_valid_backup_id("2026-07-30T16-05-22-123Z-x")); // sufixo não numérico
        assert!(!is_valid_backup_id("../etc/passwd"));
        assert!(!is_valid_backup_id(""));
        assert!(!is_valid_backup_id("2026-07-30T16-05-22-123Z-2-3")); // só um sufixo
    }

    #[test]
    fn backup_id_converts_back_to_iso() {
        assert_eq!(
            backup_id_to_iso("2026-07-30T16-05-22-123Z"),
            "2026-07-30T16:05:22.123Z"
        );
        assert_eq!(
            backup_id_to_iso("2026-07-30T16-05-22-123Z-2"),
            "2026-07-30T16:05:22.123Z"
        );
    }

    #[test]
    fn generated_backup_ids_are_valid() {
        let id = new_backup_id();
        assert!(is_valid_backup_id(&id), "id gerado inválido: {id}");
        assert_eq!(backup_id_to_iso(&id).len(), 24);
    }

    #[test]
    fn flatten_leaf_extracts_only_string_leaves() {
        let parsed = parse_vdf("\"config\" { \"convars\" { \"a\" \"1\" \"sub\" { \"b\" \"2\" } } }");
        let flat = flatten_leaf(&parsed, &["config", "convars"]);
        assert_eq!(flat.len(), 1);
        assert_eq!(flat.get("a").map(String::as_str), Some("1"));
        assert!(flatten_leaf(&parsed, &["config", "inexistente"]).is_empty());
        assert!(flatten_leaf(&parsed, &["nao-existe"]).is_empty());
    }

    #[test]
    fn file_structure_matches_ts() {
        assert_eq!(ConfigTarget::Video.file_name(), "cs2_video.txt");
        assert_eq!(ConfigTarget::Convars.file_name(), "cs2_user_convars_0_slot0.vcfg");
        assert_eq!(ConfigTarget::Binds.file_name(), "cs2_user_keys_0_slot0.vcfg");
        assert_eq!(ConfigTarget::Machine.file_name(), "cs2_machine_convars.vcfg");
        assert_eq!(ConfigTarget::Video.structure(), ("video.cfg", None));
        assert_eq!(ConfigTarget::Binds.structure(), ("config", Some("bindings")));
        assert_eq!(ConfigTarget::Convars.structure(), ("config", Some("convars")));
        assert_eq!(ConfigTarget::Machine.structure(), ("config", Some("convars")));
    }
}
