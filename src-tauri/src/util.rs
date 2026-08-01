//! Helpers compartilhados: timestamps ISO em UTC, ordenação "localeCompare"
//! e utilitários de IO (leitura lossy, rename com replace no Windows).

use std::cmp::Ordering;
use std::fs;
use std::io;
use std::path::Path;
use std::time::SystemTime;
use time::OffsetDateTime;

/// Formata como `Date.prototype.toISOString`: `2026-07-30T16:05:22.123Z` (UTC).
pub(crate) fn format_iso_utc(dt: OffsetDateTime) -> String {
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        dt.year(),
        dt.month() as u8,
        dt.day(),
        dt.hour(),
        dt.minute(),
        dt.second(),
        dt.millisecond()
    )
}

pub(crate) fn now_iso_utc() -> String {
    format_iso_utc(OffsetDateTime::now_utc())
}

pub(crate) fn system_time_to_iso(st: SystemTime) -> String {
    format_iso_utc(OffsetDateTime::from(st))
}

/// Aproxima o `String.prototype.localeCompare` do JS (collation ICU):
/// nível primário ignora caixa ("c" == "C"); no desempate, minúsculas vêm
/// antes de maiúsculas ("c" < "CAPSLOCK"). Suficiente para as chaves de
/// convar/bind (ASCII), que é onde o TS usa `localeCompare`.
pub(crate) fn locale_compare(a: &str, b: &str) -> Ordering {
    let ord = a.to_lowercase().cmp(&b.to_lowercase());
    if ord != Ordering::Equal {
        return ord;
    }
    for (ca, cb) in a.chars().zip(b.chars()) {
        match (ca.is_lowercase(), cb.is_lowercase()) {
            (true, false) => return Ordering::Less,
            (false, true) => return Ordering::Greater,
            _ => {}
        }
    }
    Ordering::Equal
}

/// Lê texto como o `fs.readFileSync(path, "utf8")` do Node: sequências
/// inválidas de UTF-8 viram U+FFFD em vez de erro.
pub(crate) fn read_text_lossy(path: &Path) -> io::Result<String> {
    let bytes = fs::read(path)?;
    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

/// `fs::rename` com semântica de replace — o `fs.renameSync` do Node (libuv)
/// substitui o destino no Windows, enquanto o `std::fs::rename` pode falhar
/// se o destino já existir (dependendo da versão do toolchain). Removemos o
/// destino antes, no Windows, para garantir o comportamento em qualquer versão.
pub(crate) fn rename_replace(from: &Path, to: &Path) -> io::Result<()> {
    #[cfg(windows)]
    {
        if to.exists() {
            fs::remove_file(to)?;
        }
    }
    fs::rename(from, to)
}
