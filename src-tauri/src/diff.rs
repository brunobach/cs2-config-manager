//! Comparação das configs de duas contas, agrupadas por tema.
//!
//! Port de `web/src/server/steam/diff.ts`. As convars comparadas são as de
//! usuário (`cs2_user_convars_0_slot0.vcfg`); buymenu e demais caem em
//! "Outras convars". Labels pt-BR idênticos ao TS.

use crate::accounts::get_account_brief;
use crate::config_files::read_account_config;
use crate::error::AppError;
use crate::groups::group_convars;
use crate::types::{DiffEntry, DiffGroup, DiffResult, DiffStatus, KeyBind};
use crate::util::locale_compare;
use indexmap::IndexMap;
use std::path::Path;

fn build_entries(
    a_map: &IndexMap<String, String>,
    b_map: &IndexMap<String, String>,
) -> Vec<DiffEntry> {
    let mut keys: Vec<&str> = a_map
        .keys()
        .chain(b_map.keys())
        .map(String::as_str)
        .collect();
    keys.sort_by(|a, b| locale_compare(a, b));
    keys.dedup();

    keys.into_iter()
        .map(|key| {
            let a_value = a_map.get(key).cloned();
            let b_value = b_map.get(key).cloned();
            let status = match (&a_value, &b_value) {
                (None, _) => DiffStatus::OnlyB,
                (Some(_), None) => DiffStatus::OnlyA,
                (Some(a), Some(b)) if a == b => DiffStatus::Same,
                _ => DiffStatus::Different,
            };
            DiffEntry {
                key: key.to_string(),
                a_value,
                b_value,
                status,
            }
        })
        .collect()
}

fn build_group(
    id: &str,
    label: &str,
    a_map: &IndexMap<String, String>,
    b_map: &IndexMap<String, String>,
) -> DiffGroup {
    let entries = build_entries(a_map, b_map);
    let diff_count = entries
        .iter()
        .filter(|entry| entry.status != DiffStatus::Same)
        .count() as u32;
    DiffGroup {
        id: id.to_string(),
        label: label.to_string(),
        entries,
        diff_count,
    }
}

fn binds_to_map(binds: &[KeyBind]) -> IndexMap<String, String> {
    binds
        .iter()
        .map(|bind| (bind.key.clone(), bind.command.clone()))
        .collect()
}

/// Mescla buymenu + others como o `{ ...buymenu, ...others }` do TS.
fn merge_others(
    groups: &crate::types::ConvarGroups,
) -> IndexMap<String, String> {
    let mut merged = groups.buymenu.clone();
    merged.extend(groups.others.iter().map(|(k, v)| (k.clone(), v.clone())));
    merged
}

pub fn diff_accounts(data_dir: &Path, a_id: &str, b_id: &str) -> Result<DiffResult, AppError> {
    if a_id == b_id {
        return Err(AppError::invalid_input(
            "Contas comparadas precisam ser diferentes",
        ));
    }
    let a_config = read_account_config(data_dir, a_id)?;
    let b_config = read_account_config(data_dir, b_id)?;

    let a_groups = group_convars(&a_config.convars);
    let b_groups = group_convars(&b_config.convars);

    let a_others = merge_others(&a_groups);
    let b_others = merge_others(&b_groups);

    Ok(DiffResult {
        a: get_account_brief(data_dir, a_id)?,
        b: get_account_brief(data_dir, b_id)?,
        groups: vec![
            build_group("video", "Vídeo", &a_config.video, &b_config.video),
            build_group("crosshair", "Crosshair", &a_groups.crosshair, &b_groups.crosshair),
            build_group("viewmodel", "Viewmodel", &a_groups.viewmodel, &b_groups.viewmodel),
            build_group("mouse", "Mouse", &a_groups.mouse, &b_groups.mouse),
            build_group("radarHud", "Radar/HUD", &a_groups.radar_hud, &b_groups.radar_hud),
            build_group("others", "Outras convars", &a_others, &b_others),
            build_group("binds", "Binds", &binds_to_map(&a_config.binds), &binds_to_map(&b_config.binds)),
        ],
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn map_of(pairs: &[(&str, &str)]) -> IndexMap<String, String> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn entries_cover_all_statuses() {
        let a = map_of(&[("same", "1"), ("diff", "1"), ("gone", "x")]);
        let b = map_of(&[("same", "1"), ("diff", "2"), ("new", "y")]);
        let entries = build_entries(&a, &b);

        let by_key = |key: &str| entries.iter().find(|e| e.key == key).unwrap();
        assert_eq!(by_key("same").status, DiffStatus::Same);
        assert_eq!(by_key("diff").status, DiffStatus::Different);
        assert_eq!(by_key("gone").status, DiffStatus::OnlyA);
        assert_eq!(by_key("gone").b_value, None);
        assert_eq!(by_key("new").status, DiffStatus::OnlyB);
        assert_eq!(by_key("new").a_value, None);
        assert_eq!(entries.len(), 4);
    }

    #[test]
    fn entries_sorted_like_locale_compare() {
        // "c" < "CAPSLOCK" no localeCompare do JS (minúsculas primeiro no desempate)
        let a = map_of(&[("CAPSLOCK", "noclip"), ("c", "slot6"), ("4", "slot4")]);
        let entries = build_entries(&a, &IndexMap::new());
        let keys: Vec<&str> = entries.iter().map(|e| e.key.as_str()).collect();
        assert_eq!(keys, ["4", "c", "CAPSLOCK"]);
    }

    #[test]
    fn group_counts_non_same_entries() {
        let a = map_of(&[("x", "1"), ("y", "1")]);
        let b = map_of(&[("x", "1"), ("y", "2"), ("z", "3")]);
        let group = build_group("others", "Outras convars", &a, &b);
        assert_eq!(group.diff_count, 2);
        assert_eq!(group.entries.len(), 3);
    }
}
