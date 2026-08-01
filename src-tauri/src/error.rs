//! Erro único do backend, serializado para o frontend como `{ code, message }`.
//!
//! O `code` pertence a um conjunto fechado que a UI mapeia para mensagens
//! i18n; o `message` é um fallback técnico em pt-BR (como no backend TS).

use serde::ser::{Serialize, SerializeStruct, Serializer};
use std::fmt;

/// Códigos possíveis (contrato com o frontend):
/// `steam_not_found`, `invalid_path`, `account_not_found`, `backup_not_found`,
/// `io`, `invalid_input`, `parse`, `network`.
#[derive(Debug)]
pub struct AppError {
    pub code: &'static str,
    pub message: String,
}

impl AppError {
    pub fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    pub fn steam_not_found() -> Self {
        Self::new(
            "steam_not_found",
            "Steam não detectada — configure o caminho do Steam manualmente",
        )
    }

    pub fn invalid_path(message: impl Into<String>) -> Self {
        Self::new("invalid_path", message)
    }

    pub fn account_not_found(message: impl Into<String>) -> Self {
        Self::new("account_not_found", message)
    }

    pub fn backup_not_found(message: impl Into<String>) -> Self {
        Self::new("backup_not_found", message)
    }

    pub fn invalid_input(message: impl Into<String>) -> Self {
        Self::new("invalid_input", message)
    }

    // Mantidos para completar o conjunto fechado de códigos do contrato;
    // hoje nenhum fluxo os emite (o parser VDF é tolerante e erros de rede
    // viram `None` no comando de avatar).
    #[allow(dead_code)]
    pub fn parse(message: impl Into<String>) -> Self {
        Self::new("parse", message)
    }

    #[allow(dead_code)]
    pub fn network(message: impl Into<String>) -> Self {
        Self::new("network", message)
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut state = serializer.serialize_struct("AppError", 2)?;
        state.serialize_field("code", self.code)?;
        state.serialize_field("message", &self.message)?;
        state.end()
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        Self::new("io", err.to_string())
    }
}
