//! Screenshots do CS2 tiradas via Steam (F12): leitura de
//! `userdata/<accountId>/760/remote/730/screenshots/*.jpg`.
//!
//! Os bytes vão ao frontend via comando `get_screenshot` e viram blob URL —
//! mesmo padrão do avatar (evita habilitar o asset protocol). Pasta ausente
//! (conta sem screenshots) não é erro: lista vazia / `None`.

use crate::steam_locator;
use crate::types::ScreenshotInfo;
use crate::util::system_time_to_iso;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// Resolve a pasta de screenshots; `None` se conta inválida, Steam não
/// detectada ou pasta inexistente (conta nunca tirou screenshot).
fn screenshots_dir(data_dir: &Path, account_id: &str) -> Option<PathBuf> {
    if account_id.is_empty() || !account_id.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let (steam_path, _) = steam_locator::resolve_steam_path(data_dir);
    let dir = Path::new(&steam_path?)
        .join("userdata")
        .join(account_id)
        .join("760")
        .join("remote")
        .join("730")
        .join("screenshots");
    dir.is_dir().then_some(dir)
}

/// Nome válido de screenshot: `<algo>.jpg` simples, sem separadores/traversal.
/// A Steam grava `YYYYMMDDHHMMSS_N.jpg`, mas aceitamos qualquer .jpg simples
/// para tolerar renomeações manuais.
fn is_screenshot_name(name: &str) -> bool {
    name.len() > 4
        && name.len() <= 128
        && name.to_ascii_lowercase().ends_with(".jpg")
        && !name.starts_with('.')
        && !name.contains("..")
        && name
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b'_' | b'-'))
}

/// Lista os .jpg da pasta, mais recentes primeiro.
pub fn list_screenshots(data_dir: &Path, account_id: &str) -> Vec<ScreenshotInfo> {
    let Some(dir) = screenshots_dir(data_dir, account_id) else {
        return Vec::new();
    };
    let entries = match fs::read_dir(&dir) {
        Ok(entries) => entries,
        Err(_) => return Vec::new(),
    };

    let mut shots: Vec<(ScreenshotInfo, SystemTime)> = entries
        .flatten()
        .filter_map(|entry| {
            let name = entry.file_name().to_string_lossy().into_owned();
            if !is_screenshot_name(&name) {
                return None;
            }
            let metadata = entry.metadata().ok()?;
            if !metadata.is_file() {
                return None;
            }
            let modified = metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH);
            Some((
                ScreenshotInfo {
                    name,
                    size: metadata.len(),
                    mtime: system_time_to_iso(modified),
                },
                modified,
            ))
        })
        .collect();

    shots.sort_by(|a, b| b.1.cmp(&a.1));
    shots.into_iter().map(|(info, _)| info).collect()
}

/// Bytes de uma screenshot pelo nome (validado contra traversal).
pub fn get_screenshot_bytes(data_dir: &Path, account_id: &str, name: &str) -> Option<Vec<u8>> {
    if !is_screenshot_name(name) {
        return None;
    }
    let dir = screenshots_dir(data_dir, account_id)?;
    fs::read(dir.join(name)).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn screenshot_name_validation() {
        assert!(is_screenshot_name("20250430153952_1.jpg"));
        assert!(is_screenshot_name("20250430153952_1.JPG"));
        assert!(is_screenshot_name("minha-foto_2.jpg"));
        assert!(!is_screenshot_name("foto.png"));
        assert!(!is_screenshot_name(".jpg"));
        assert!(!is_screenshot_name("../cfg/cs2_video.txt.jpg"));
        assert!(!is_screenshot_name("a/b.jpg"));
        assert!(!is_screenshot_name("..jpg"));
        assert!(!is_screenshot_name(".hidden.jpg"));
        assert!(!is_screenshot_name("com espaço.jpg"));
    }
}
