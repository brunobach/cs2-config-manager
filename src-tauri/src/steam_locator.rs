//! Localização da instalação da Steam e da pasta `cfg` do CS2.
//!
//! Port de `web/src/server/steam/steam-locator.ts`: registry do Windows
//! (`HKCU\Software\Valve\Steam\SteamPath`, via crate `winreg` em vez do
//! `reg query` do TS) → paths de fallback; `steamapps/libraryfolders.vdf`
//! para as libraries; processos via `tasklist`. Fora do Windows, registry e
//! processos retornam vazio/false como no TS (`process.platform !== "win32"`).

use crate::settings;
use crate::types::{SteamPathInfo, SteamPathSource};
use crate::util::read_text_lossy;
use crate::vdf::{parse_vdf, VdfValue};
use std::collections::HashSet;
use std::path::Path;

pub const STEAM_PATH_OVERRIDE_KEY: &str = "steam_path_override";

const FALLBACK_PATHS: [&str; 4] = [
    "C:\\Program Files (x86)\\Steam",
    "C:\\Program Files\\Steam",
    "D:\\Steam",
    "D:\\SteamLibrary",
];

fn is_valid_steam_dir(dir: &Path) -> bool {
    dir.join("userdata").is_dir()
}

#[cfg(windows)]
fn detect_steam_path_from_registry() -> Option<String> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let key = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey("Software\\Valve\\Steam")
        .ok()?;
    let candidate: String = key.get_value("SteamPath").ok()?;
    if is_valid_steam_dir(Path::new(&candidate)) {
        Some(candidate)
    } else {
        None
    }
}

#[cfg(not(windows))]
fn detect_steam_path_from_registry() -> Option<String> {
    None
}

pub fn detect_steam_path() -> Option<String> {
    if let Some(from_registry) = detect_steam_path_from_registry() {
        return Some(from_registry);
    }
    for candidate in FALLBACK_PATHS {
        if is_valid_steam_dir(Path::new(candidate)) {
            return Some(candidate.to_string());
        }
    }
    None
}

/// Ordem de resolução: override salvo → env `STEAM_PATH` → detecção automática.
pub fn resolve_steam_path(data_dir: &Path) -> (Option<String>, Option<SteamPathSource>) {
    if let Some(path_override) = settings::get_setting(data_dir, STEAM_PATH_OVERRIDE_KEY) {
        if is_valid_steam_dir(Path::new(&path_override)) {
            return (Some(path_override), Some(SteamPathSource::Override));
        }
    }

    if let Ok(env) = std::env::var("STEAM_PATH") {
        if !env.is_empty() && is_valid_steam_dir(Path::new(&env)) {
            return (Some(env), Some(SteamPathSource::Env));
        }
    }

    if let Some(auto) = detect_steam_path() {
        return (Some(auto), Some(SteamPathSource::Auto));
    }

    (None, None)
}

/// Lista as library folders da Steam (a principal + extras de `libraryfolders.vdf`).
pub fn get_library_folders(steam_path: &str) -> Vec<String> {
    let fallback = || vec![steam_path.to_string()];
    let vdf_path = Path::new(steam_path)
        .join("steamapps")
        .join("libraryfolders.vdf");

    // registry usa forward slash/minúsculas; o VDF usa backslash — normaliza para dedup
    let normalize = |p: &str| p.replace('/', "\\").trim_end_matches('\\').to_lowercase();

    let raw = match read_text_lossy(&vdf_path) {
        Ok(raw) => raw,
        Err(_) => return fallback(),
    };
    let parsed = parse_vdf(&raw);
    let root = match parsed.get("libraryfolders") {
        Some(VdfValue::Object(root)) => root,
        _ => return fallback(),
    };

    let mut seen: HashSet<String> = HashSet::from([normalize(steam_path)]);
    let mut paths = vec![steam_path.to_string()];
    for (key, entry) in root.iter() {
        if key.is_empty() || !key.bytes().all(|b| b.is_ascii_digit()) {
            continue;
        }
        let VdfValue::Object(entry) = entry else {
            continue;
        };
        let Some(VdfValue::Str(lib_path)) = entry.get("path") else {
            continue;
        };
        if lib_path.is_empty() {
            continue;
        }
        if !seen.insert(normalize(lib_path)) {
            continue;
        }
        paths.push(lib_path.clone());
    }
    paths
}

/// Procura a pasta `cfg` da instalação do CS2 em cada library folder.
pub fn find_cs2_cfg_dir(steam_path: &str) -> Option<String> {
    for lib in get_library_folders(steam_path) {
        let cfg_dir = Path::new(&lib)
            .join("steamapps")
            .join("common")
            .join("Counter-Strike Global Offensive")
            .join("game")
            .join("csgo")
            .join("cfg");
        if cfg_dir.is_dir() {
            return Some(cfg_dir.to_string_lossy().into_owned());
        }
    }
    None
}

/// `(steamRunning, cs2Running)` via `tasklist`, case-insensitive.
#[cfg(windows)]
pub fn get_running_processes() -> (bool, bool) {
    use std::os::windows::process::CommandExt;

    let output = std::process::Command::new("tasklist")
        .args(["/fo", "csv", "/nh"])
        // CREATE_NO_WINDOW — evita um flash de console no app GUI
        .creation_flags(0x08000000)
        .output();
    match output {
        Ok(out) => {
            let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
            (text.contains("steam.exe"), text.contains("cs2.exe"))
        }
        Err(_) => (false, false),
    }
}

#[cfg(not(windows))]
pub fn get_running_processes() -> (bool, bool) {
    (false, false)
}

pub fn get_steam_path_info(data_dir: &Path) -> SteamPathInfo {
    let (steam_path, source) = resolve_steam_path(data_dir);
    let (steam_running, cs2_running) = get_running_processes();
    SteamPathInfo {
        libraries: steam_path
            .as_deref()
            .map(get_library_folders)
            .unwrap_or_default(),
        cs2_cfg_dir: steam_path.as_deref().and_then(find_cs2_cfg_dir),
        path: steam_path,
        source,
        steam_running,
        cs2_running,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn library_folders_fall_back_to_main_path() {
        // caminho inexistente: leitura falha → só a library principal
        let libs = get_library_folders("C:\\caminho\\que\\nao\\existe");
        assert_eq!(libs, vec!["C:\\caminho\\que\\nao\\existe".to_string()]);
    }

    #[test]
    fn library_folders_parse_and_dedup() {
        let dir = std::env::temp_dir().join(format!("cs2cfg-libs-test-{}", std::process::id()));
        let steamapps = dir.join("steamapps");
        std::fs::create_dir_all(&steamapps).unwrap();
        std::fs::write(
            steamapps.join("libraryfolders.vdf"),
            "\"libraryfolders\"\n{\n\t\"0\"\n\t{\n\t\t\"path\"\t\t\"D:\\\\SteamLibrary\"\n\t}\n\t\"1\"\n\t{\n\t\t\"path\"\t\t\"d:/steamlibrary/\"\n\t}\n\t\"apps\"\n\t{\n\t\t\"path\"\t\t\"E:\\\\ignorar\"\n\t}\n}\n",
        )
        .unwrap();
        let main = dir.to_string_lossy().into_owned();
        let libs = get_library_folders(&main);
        // "1" é dupe normalizada de "0"; a chave não numérica é ignorada
        assert_eq!(libs, vec![main, "D:\\SteamLibrary".to_string()]);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
