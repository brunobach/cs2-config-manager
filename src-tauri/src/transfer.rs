//! Cópia de seções de config entre contas.
//!
//! Port de `web/src/server/steam/transfer.ts`: só copia os 4 nomes em
//! `ConfigTarget::file_name` — `*.bak`, `trustedlaunch.cfg` e `qmmconnect.dt`
//! nunca são tocados. Backup do destino antes. Para os 2 arquivos
//! sincronizados com a Steam Cloud, o sibling `_lastclouded` recebe o mesmo
//! conteúdo (ver `atomic_write_cloud_aware`) — sem isso o CS2 reverte a
//! transferência na próxima abertura do jogo.
//!
//! Exceção de cópia: o vídeo NÃO é copiado byte a byte — `merge_video_config`
//! preserva as chaves de identidade de hardware do destino para o CS2 não
//! detectar "GPU trocada" e resetar o vídeo para os defaults.

use crate::config_files::{account_cfg_dir, atomic_write_cloud_aware, create_backup};
use crate::error::AppError;
use crate::types::{ConfigTarget, TransferResult, TransferSections};
use crate::util::read_text_lossy;
use crate::vdf::{parse_vdf, serialize_vdf, VdfValue};
use std::fs;
use std::path::Path;

/// `SECTION_TO_TARGET` do TS.
fn section_targets(sections: &TransferSections) -> [(bool, ConfigTarget); 4] {
    [
        (sections.video, ConfigTarget::Video),
        (sections.convars, ConfigTarget::Convars),
        (sections.binds, ConfigTarget::Binds),
        (sections.machine, ConfigTarget::Machine),
    ]
}

/// Chaves de identidade de hardware do `cs2_video.txt`: se a transferência
/// trouxer os valores da conta origem, o CS2 detecta "hardware diferente" na
/// abertura e regenera o vídeo com os defaults. Sempre preservadas do destino.
const VIDEO_DEVICE_KEYS: [&str; 3] = ["VendorID", "DeviceID", "setting.knowndevice"];
/// Variantes de caixa da flag de autoconfig (o CS2 já gravou das duas formas).
/// `AutoConfig=1` pede re-detecção (reset) na próxima abertura; `2` = ok.
const VIDEO_AUTOCONFIG_KEYS: [&str; 2] = ["AutoConfig", "Autoconfig"];

/// Mescla o vídeo da origem com as chaves de hardware/autoconfig do destino.
/// Se a origem não tem a estrutura esperada, devolve o conteúdo bruto inalterado.
fn merge_video_config(src_content: &str, dest_content: Option<&str>) -> String {
    let mut parsed = parse_vdf(src_content);
    if !matches!(parsed.get("video.cfg"), Some(VdfValue::Object(_))) {
        return src_content.to_string();
    }

    let dest_parsed = dest_content.map(parse_vdf);
    let dest_root = dest_parsed.as_ref().and_then(|parsed| match parsed.get("video.cfg") {
        Some(VdfValue::Object(obj)) => Some(obj),
        _ => None,
    });

    let mut preserved: Vec<(String, String)> = Vec::new();
    if let Some(dest_root) = dest_root {
        for key in VIDEO_DEVICE_KEYS.into_iter().chain(VIDEO_AUTOCONFIG_KEYS) {
            if let Some(VdfValue::Str(value)) = dest_root.get(key) {
                preserved.push((key.to_string(), value.clone()));
            }
        }
    }

    let Some(VdfValue::Object(root)) = parsed.get_mut("video.cfg") else {
        unreachable!("estrutura checada acima");
    };
    // Remove as duas variantes para não ficar com caixas diferentes duplicadas
    // quando origem e destino gravaram formas diferentes ("AutoConfig" vs "Autoconfig").
    for key in VIDEO_AUTOCONFIG_KEYS {
        root.remove(key);
    }
    let preserved_has_autoconfig = preserved
        .iter()
        .any(|(key, _)| VIDEO_AUTOCONFIG_KEYS.contains(&key.as_str()));
    if !preserved_has_autoconfig {
        // Destino sem a flag (ou conta nova): força o estado "configurado" para
        // a origem não trazer um `=1` que resetaria o vídeo na abertura.
        root.insert("AutoConfig".to_string(), VdfValue::Str("2".to_string()));
    }
    for (key, value) in preserved {
        root.insert(key, VdfValue::Str(value));
    }

    serialize_vdf("video.cfg", root)
}

/// Copia as seções selecionadas da conta origem para a destino.
/// Faz backup do destino antes. Arquivos ausentes na origem são pulados.
pub fn transfer_configs(
    data_dir: &Path,
    from_id: &str,
    to_id: &str,
    sections: &TransferSections,
) -> Result<TransferResult, AppError> {
    if from_id == to_id {
        return Err(AppError::invalid_input(
            "Conta de origem e destino precisam ser diferentes",
        ));
    }
    let src_dir = account_cfg_dir(data_dir, from_id)?;
    let dest_dir = account_cfg_dir(data_dir, to_id)?;

    let backup_id = create_backup(data_dir, to_id)?;

    let mut copied: Vec<String> = Vec::new();
    for (enabled, target) in section_targets(sections) {
        if !enabled {
            continue;
        }
        let name = target.file_name();
        let src_path = src_dir.join(name);
        if !src_path.exists() {
            continue;
        }
        let dest_path = dest_dir.join(name);
        if target == ConfigTarget::Video {
            let src_content = read_text_lossy(&src_path)?;
            let dest_content = if dest_path.exists() {
                Some(read_text_lossy(&dest_path)?)
            } else {
                None
            };
            let merged = merge_video_config(&src_content, dest_content.as_deref());
            atomic_write_cloud_aware(&dest_path, merged.as_bytes())?;
        } else {
            let content = fs::read(&src_path)?;
            atomic_write_cloud_aware(&dest_path, &content)?;
        }
        copied.push(name.to_string());
    }

    Ok(TransferResult { copied, backup_id })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn root_str<'a>(parsed: &'a crate::vdf::VdfObject, key: &str) -> &'a str {
        let Some(VdfValue::Object(root)) = parsed.get("video.cfg") else {
            panic!("sem bloco video.cfg");
        };
        match root.get(key) {
            Some(VdfValue::Str(value)) => value.as_str(),
            _ => panic!("esperava string \"{key}\""),
        }
    }

    #[test]
    fn video_merge_preserves_dest_device_keys() {
        let src = "\"video.cfg\"\n{\n\t\"Version\"\t\t\"16\"\n\t\"VendorID\"\t\t\"4318\"\n\t\"DeviceID\"\t\t\"11525\"\n\t\"setting.knowndevice\"\t\t\"0\"\n\t\"setting.defaultres\"\t\t\"1280\"\n\t\"AutoConfig\"\t\t\"2\"\n}\n";
        let dest = "\"video.cfg\"\n{\n\t\"Version\"\t\t\"15\"\n\t\"VendorID\"\t\t\"4318\"\n\t\"DeviceID\"\t\t\"7042\"\n\t\"setting.knowndevice\"\t\t\"1\"\n\t\"setting.defaultres\"\t\t\"1440\"\n\t\"Autoconfig\"\t\t\"2\"\n}\n";

        let merged = merge_video_config(src, Some(dest));
        let parsed = parse_vdf(&merged);

        assert_eq!(root_str(&parsed, "DeviceID"), "7042"); // destino
        assert_eq!(root_str(&parsed, "VendorID"), "4318"); // destino
        assert_eq!(root_str(&parsed, "setting.knowndevice"), "1"); // destino
        assert_eq!(root_str(&parsed, "Autoconfig"), "2"); // variante do destino
        assert_eq!(root_str(&parsed, "setting.defaultres"), "1280"); // origem
        assert_eq!(root_str(&parsed, "Version"), "16"); // origem
        let Some(VdfValue::Object(root)) = parsed.get("video.cfg") else {
            unreachable!();
        };
        assert!(root.get("AutoConfig").is_none()); // sem caixas duplicadas
    }

    #[test]
    fn video_merge_without_dest_file_forces_autoconfig_done() {
        let src = "\"video.cfg\"\n{\n\t\"DeviceID\"\t\t\"11525\"\n\t\"Autoconfig\"\t\t\"1\"\n}\n";

        let merged = merge_video_config(src, None);
        let parsed = parse_vdf(&merged);

        assert_eq!(root_str(&parsed, "AutoConfig"), "2");
        let Some(VdfValue::Object(root)) = parsed.get("video.cfg") else {
            unreachable!();
        };
        assert!(root.get("Autoconfig").is_none());
    }

    #[test]
    fn video_merge_tolerates_malformed_source() {
        let raw = "lixo sem estrutura";
        assert_eq!(merge_video_config(raw, None), raw);
    }
}
