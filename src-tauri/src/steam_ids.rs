//! Conversões steamID64 <-> accountID (pasta de `userdata/`).
//! accountID = steamID64 - 76561197960265728.
//!
//! Entradas não numéricas/negativas retornam `AppError` `invalid_input` —
//! equivalente ao `Error` que as rotas TS tratavam como 400/404.

use crate::error::AppError;

const STEAM_ID64_BASE: u64 = 76561197960265728;

fn parse_digits(value: &str, label: &str) -> Result<u64, AppError> {
    if value.is_empty() || !value.bytes().all(|b| b.is_ascii_digit()) {
        return Err(AppError::invalid_input(format!("{label} inválido: \"{value}\"")));
    }
    value
        .parse::<u64>()
        .map_err(|_| AppError::invalid_input(format!("{label} inválido: \"{value}\"")))
}

pub fn steam_id64_to_account_id(id64: &str) -> Result<String, AppError> {
    let id = parse_digits(id64, "steamID64")?;
    let account_id = id
        .checked_sub(STEAM_ID64_BASE)
        .ok_or_else(|| AppError::invalid_input(format!("steamID64 inválido: \"{id64}\" (menor que a base Steam)")))?;
    Ok(account_id.to_string())
}

pub fn account_id_to_steam_id64(account_id: &str) -> Result<String, AppError> {
    let id = parse_digits(account_id, "accountID")?;
    Ok((id + STEAM_ID64_BASE).to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_account_id_to_steam_id64() {
        assert_eq!(account_id_to_steam_id64("123456789").unwrap(), "76561198083722517");
        assert_eq!(account_id_to_steam_id64("0").unwrap(), "76561197960265728");
    }

    #[test]
    fn converts_steam_id64_to_account_id() {
        assert_eq!(steam_id64_to_account_id("76561198083722517").unwrap(), "123456789");
        assert_eq!(steam_id64_to_account_id("76561197960265728").unwrap(), "0");
    }

    #[test]
    fn round_trip() {
        let id64 = account_id_to_steam_id64("123456789").unwrap();
        assert_eq!(steam_id64_to_account_id(&id64).unwrap(), "123456789");
    }

    #[test]
    fn rejects_invalid_input() {
        assert!(account_id_to_steam_id64("").is_err());
        assert!(account_id_to_steam_id64("abc").is_err());
        assert!(account_id_to_steam_id64("12a3").is_err());
        assert!(account_id_to_steam_id64("-5").is_err());
        assert!(account_id_to_steam_id64(" 123456789").is_err());
        // menor que a base Steam
        assert!(steam_id64_to_account_id("123456789").is_err());
    }
}
