//! Curadoria de convars do CS2 por grupo. Prefixos (`cl_crosshair`,
//! `cl_grenadecrosshair`, `cl_buymenu`, `cl_buywheel`) fazem match por prefixo;
//! as demais listas são exatas. O que sobrar vai para `others`.
//!
//! Port de `web/src/server/steam/groups.ts` — mesmas listas de chaves.

use crate::types::ConvarGroups;
use indexmap::IndexMap;

pub const CROSSHAIR_KEYS: &[&str] = &[
    "cl_crosshair_drawoutline",
    "cl_crosshair_dynamic_maxdist_splitratio",
    "cl_crosshair_dynamic_splitalpha_innermod",
    "cl_crosshair_dynamic_splitalpha_outermod",
    "cl_crosshair_dynamic_splitdist",
    "cl_crosshair_outlinethickness",
    "cl_crosshair_recoil",
    "cl_crosshair_sniper_width",
    "cl_crosshairalpha",
    "cl_crosshaircolor",
    "cl_crosshaircolor_b",
    "cl_crosshaircolor_g",
    "cl_crosshaircolor_r",
    "cl_crosshairdot",
    "cl_crosshairgap",
    "cl_crosshairgap_useweaponvalue",
    "cl_crosshairsize",
    "cl_crosshairstyle",
    "cl_crosshairt",
    "cl_crosshairthickness",
    "cl_crosshairusealpha",
    "cl_fixedcrosshairgap",
    "cl_debounce_zoom",
    "cl_grenadecrosshairalpha",
    "cl_grenadecrosshairdelay",
    "cl_grenadecrosshairdot",
    "cl_grenadecrosshairsplitdist",
    "cl_grenadecrosshairsplitratio",
    "cl_grenadecrosshairthickness",
];

pub const VIEWMODEL_KEYS: &[&str] = &[
    "viewmodel_fov",
    "viewmodel_offset_x",
    "viewmodel_offset_y",
    "viewmodel_offset_z",
    "viewmodel_presetpos",
];

pub const MOUSE_KEYS: &[&str] = &[
    "sensitivity",
    "zoom_sensitivity_ratio_mouse",
    "m_pitch",
    "m_yaw",
    "m_customaccel",
    "m_customaccel_exponent",
    "m_customaccel_max",
    "m_customaccel_scale",
    "m_rawinput",
];

pub const RADAR_HUD_KEYS: &[&str] = &[
    "cl_hud_radar_scale",
    "cl_radar_always_centered",
    "cl_radar_scale",
    "cl_radar_rotate",
    "cl_radar_square_with_scoreboard",
    "cl_radar_icon_scale_min",
    "hud_scaling",
    "cl_showloadout",
    "cl_hud_color",
    "cl_hud_background_alpha",
    "cl_hud_playercount_pos",
    "cl_hud_playercount_showcount",
    "cl_hud_healthammo_style",
    "cl_hud_bomb_under_radar",
];

pub const CROSSHAIR_PREFIXES: &[&str] = &["cl_crosshair", "cl_grenadecrosshair"];
pub const BUYMENU_PREFIXES: &[&str] = &["cl_buymenu", "cl_buywheel"];

fn has_prefix(key: &str, prefixes: &[&str]) -> bool {
    prefixes.iter().any(|prefix| key.starts_with(prefix))
}

pub fn is_crosshair_key(key: &str) -> bool {
    has_prefix(key, CROSSHAIR_PREFIXES) || CROSSHAIR_KEYS.contains(&key)
}

pub fn group_convars(convars: &IndexMap<String, String>) -> ConvarGroups {
    let mut groups = ConvarGroups::default();
    for (key, value) in convars {
        let bucket = if is_crosshair_key(key) {
            &mut groups.crosshair
        } else if VIEWMODEL_KEYS.contains(&key.as_str()) {
            &mut groups.viewmodel
        } else if MOUSE_KEYS.contains(&key.as_str()) {
            &mut groups.mouse
        } else if RADAR_HUD_KEYS.contains(&key.as_str()) {
            &mut groups.radar_hud
        } else if has_prefix(key, BUYMENU_PREFIXES) {
            &mut groups.buymenu
        } else {
            &mut groups.others
        };
        bucket.insert(key.clone(), value.clone());
    }
    groups
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
    fn groups_by_exact_key_prefix_and_fallback() {
        let groups = group_convars(&map_of(&[
            ("cl_crosshairsize", "2"),          // exata crosshair
            ("cl_crosshaircolor_r", "255"),     // exata crosshair
            ("cl_crosshair_unknown_new", "1"),  // prefixo crosshair
            ("cl_grenadecrosshairdelay", "0"),  // exata/prefixo crosshair
            ("viewmodel_fov", "68"),            // viewmodel
            ("sensitivity", "1.5"),             // mouse
            ("m_rawinput", "1"),                // mouse
            ("hud_scaling", "0.95"),            // radarHud
            ("cl_radar_scale", "0.3"),          // radarHud
            ("cl_buymenu_fade", "1"),           // prefixo buymenu
            ("cl_buywheel_donate", "0"),        // prefixo buymenu
            ("mp_maxmoney", "16000"),           // others
        ]));

        assert_eq!(groups.crosshair.len(), 4);
        assert_eq!(groups.viewmodel.len(), 1);
        assert_eq!(groups.mouse.len(), 2);
        assert_eq!(groups.radar_hud.len(), 2);
        assert_eq!(groups.buymenu.len(), 2);
        assert_eq!(groups.others.len(), 1);
        assert_eq!(groups.others.get("mp_maxmoney").map(String::as_str), Some("16000"));
    }

    #[test]
    fn crosshair_prefix_does_not_steal_exact_mouse_keys() {
        // "sensitivity" etc. não começam com cl_crosshair — sanity check
        assert!(!is_crosshair_key("sensitivity"));
        assert!(is_crosshair_key("cl_crosshairsize"));
        assert!(is_crosshair_key("cl_crosshairalgo_novo"));
        assert!(is_crosshair_key("cl_grenadecrosshairdot"));
        assert!(!is_crosshair_key("cl_buymenu_x"));
    }
}
