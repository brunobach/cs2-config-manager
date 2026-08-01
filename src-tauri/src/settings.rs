//! Settings persistidos em `settings.json` no `app_data_dir` do Tauri.
//!
//! Substitui o SQLite (`app_settings`) do backend web: get/set/clear de chaves
//! string. O arquivo é criado sob demanda e toda escrita é atômica (tmp + rename).

use crate::error::AppError;
use crate::util::rename_replace;
use serde_json::{Map, Value};
use std::fs;
use std::path::{Path, PathBuf};

const FILE_NAME: &str = "settings.json";

fn settings_path(data_dir: &Path) -> PathBuf {
    data_dir.join(FILE_NAME)
}

/// Lê o mapa inteiro; arquivo ausente ou JSON inválido viram mapa vazio.
fn read_all(data_dir: &Path) -> Map<String, Value> {
    let Ok(bytes) = fs::read(settings_path(data_dir)) else {
        return Map::new();
    };
    serde_json::from_slice::<Value>(&bytes)
        .ok()
        .and_then(|value| value.as_object().cloned())
        .unwrap_or_default()
}

fn write_all(data_dir: &Path, map: &Map<String, Value>) -> Result<(), AppError> {
    let content = serde_json::to_string_pretty(&Value::Object(map.clone()))
        .map_err(|err| AppError::new("io", err.to_string()))?;
    let tmp_path = data_dir.join(format!("{FILE_NAME}.tmp-{}", std::process::id()));
    fs::write(&tmp_path, content)?;
    rename_replace(&tmp_path, &settings_path(data_dir))?;
    Ok(())
}

pub fn get_setting(data_dir: &Path, key: &str) -> Option<String> {
    read_all(data_dir)
        .get(key)
        .and_then(|value| value.as_str())
        .map(String::from)
}

pub fn set_setting(data_dir: &Path, key: &str, value: &str) -> Result<(), AppError> {
    let mut map = read_all(data_dir);
    map.insert(key.to_string(), Value::String(value.to_string()));
    write_all(data_dir, &map)
}

pub fn clear_setting(data_dir: &Path, key: &str) -> Result<(), AppError> {
    let mut map = read_all(data_dir);
    map.remove(key);
    write_all(data_dir, &map)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(test_name: &str) -> PathBuf {
        // nome por teste: cargo roda os testes em threads paralelas
        let dir = std::env::temp_dir().join(format!("cs2cfg-settings-{test_name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn get_set_clear_roundtrip() {
        let dir = temp_dir("roundtrip");
        assert_eq!(get_setting(&dir, "steam_path_override"), None);

        set_setting(&dir, "steam_path_override", "D:\\Steam").unwrap();
        assert_eq!(get_setting(&dir, "steam_path_override"), Some("D:\\Steam".to_string()));

        // sobrescreve
        set_setting(&dir, "steam_path_override", "E:\\Steam").unwrap();
        assert_eq!(get_setting(&dir, "steam_path_override"), Some("E:\\Steam".to_string()));

        // outras chaves convivem
        set_setting(&dir, "outra", "x").unwrap();
        clear_setting(&dir, "steam_path_override").unwrap();
        assert_eq!(get_setting(&dir, "steam_path_override"), None);
        assert_eq!(get_setting(&dir, "outra"), Some("x".to_string()));

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn corrupt_file_reads_as_empty() {
        let dir = temp_dir("corrupt");
        fs::write(settings_path(&dir), "not json {{{").unwrap();
        assert_eq!(get_setting(&dir, "qualquer"), None);
        // e uma escrita se recupera sobrescrevendo o arquivo
        set_setting(&dir, "k", "v").unwrap();
        assert_eq!(get_setting(&dir, "k"), Some("v".to_string()));

        let _ = fs::remove_dir_all(&dir);
    }
}
