//! Avatar da conta: bytes locais do avatarcache da Steam e fallback remoto.
//!
//! - `get_avatar_bytes`: lê `config/avatarcache/<steamid64>.png|.jpg|.jpeg`
//!   (o frontend monta um Blob com os bytes — evita asset protocol).
//! - `fetch_avatar_url`: equivalente ao proxy `/api/steam/avatar` do web —
//!   GET `https://steamcommunity.com/profiles/<id>/?xml=1` e extrai
//!   `<avatarMedium>` (CDATA ou tag simples). Timeout de 5s; qualquer erro de
//!   rede vira `None` (a UI tem fallback próprio), nunca `AppError`.

use crate::accounts::resolve_avatar_path;
use crate::steam_ids::account_id_to_steam_id64;
use crate::steam_locator;
use std::fs;
use std::path::Path;
use std::time::Duration;

pub fn get_avatar_bytes(data_dir: &Path, account_id: &str) -> Option<Vec<u8>> {
    let steam_id64 = account_id_to_steam_id64(account_id).ok()?;
    let (steam_path, _) = steam_locator::resolve_steam_path(data_dir);
    let path = resolve_avatar_path(&steam_path?, &steam_id64)?;
    fs::read(path).ok()
}

pub fn fetch_avatar_url(steam_id64: &str) -> Option<String> {
    if steam_id64.is_empty() || !steam_id64.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    let url = format!("https://steamcommunity.com/profiles/{steam_id64}/?xml=1");
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .ok()?;
    let response = client.get(&url).send().ok()?;
    if !response.status().is_success() {
        return None;
    }
    let xml = response.text().ok()?;
    extract_avatar_medium(&xml)
}

/// Equivalente às regexes do TS:
/// `/<avatarMedium><!\[CDATA\[(.*?)\]\]><\/avatarMedium>/` e, como fallback,
/// `/<avatarMedium>(.*?)<\/avatarMedium>/` (ambas não-gulosas → primeiro fechamento).
fn extract_avatar_medium(xml: &str) -> Option<String> {
    const CDATA_OPEN: &str = "<avatarMedium><![CDATA[";
    const CDATA_CLOSE: &str = "]]></avatarMedium>";
    const TAG_OPEN: &str = "<avatarMedium>";
    const TAG_CLOSE: &str = "</avatarMedium>";

    if let Some(start) = xml.find(CDATA_OPEN) {
        let rest = &xml[start + CDATA_OPEN.len()..];
        if let Some(end) = rest.find(CDATA_CLOSE) {
            return Some(rest[..end].to_string());
        }
    }
    if let Some(start) = xml.find(TAG_OPEN) {
        let rest = &xml[start + TAG_OPEN.len()..];
        if let Some(end) = rest.find(TAG_CLOSE) {
            return Some(rest[..end].to_string());
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_cdata_avatar() {
        let xml = r#"<?xml version="1.0"?><profile><avatarMedium><![CDATA[https://avatars.steamstatic.com/abc_medium.jpg]]></avatarMedium></profile>"#;
        assert_eq!(
            extract_avatar_medium(xml),
            Some("https://avatars.steamstatic.com/abc_medium.jpg".to_string())
        );
    }

    #[test]
    fn extracts_plain_tag_avatar() {
        let xml = "<profile><avatarMedium>https://example.com/a.jpg</avatarMedium></profile>";
        assert_eq!(
            extract_avatar_medium(xml),
            Some("https://example.com/a.jpg".to_string())
        );
    }

    #[test]
    fn prefers_cdata_over_plain_like_ts() {
        let xml = "<avatarMedium><![CDATA[https://cdata.jpg]]></avatarMedium><avatarMedium>https://plain.jpg</avatarMedium>";
        assert_eq!(extract_avatar_medium(xml), Some("https://cdata.jpg".to_string()));
    }

    #[test]
    fn returns_none_without_avatar_medium() {
        assert_eq!(extract_avatar_medium("<profile></profile>"), None);
        assert_eq!(extract_avatar_medium(""), None);
    }
}
