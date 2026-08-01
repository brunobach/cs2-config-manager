//! Cópia de seções de config entre contas.
//!
//! Port de `web/src/server/steam/transfer.ts`: só copia os 4 nomes em
//! `ConfigTarget::file_name` — `*_lastclouded`, `*.bak`, `trustedlaunch.cfg`
//! e `qmmconnect.dt` nunca são tocados. Backup do destino antes.

use crate::config_files::{account_cfg_dir, atomic_write_bytes, create_backup};
use crate::error::AppError;
use crate::types::{ConfigTarget, TransferResult, TransferSections};
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
        let content = fs::read(&src_path)?;
        atomic_write_bytes(&dest_dir.join(name), &content)?;
        copied.push(name.to_string());
    }

    Ok(TransferResult { copied, backup_id })
}
