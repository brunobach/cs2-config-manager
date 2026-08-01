//! Parser/serializador minimalista de KeyValues (VDF), formato usado pela Steam
//! e pelos arquivos de config do CS2 (`.vcfg`, `cs2_video.txt`, `loginusers.vdf`).
//!
//! Suporta: strings quoted, blocos `{ }`, comentários `//` fora de quotes e
//! escapes `\"` / `\\`. Chave duplicada fica com o último valor (aceitável).
//!
//! Port de `web/src/server/steam/vdf.ts`. Diferente do TS (que usa objetos JS),
//! aqui a ordem de inserção é preservada explicitamente por um Vec de pares —
//! necessário para que `update_config_keys` reescreva os arquivos mantendo a
//! ordem original das chaves, como o backend TS faz.

/// Equivalente a `string | VdfObject` do TS.
#[derive(Debug, Clone, PartialEq)]
pub enum VdfValue {
    Str(String),
    Object(VdfObject),
}

/// Equivalente ao `VdfObject` do TS: pares chave→valor em ordem de inserção.
/// Inserir em chave existente substitui o valor mantendo a posição original
/// (semântica de `obj[key] = value` do JS).
#[derive(Debug, Clone, Default, PartialEq)]
pub struct VdfObject {
    entries: Vec<(String, VdfValue)>,
}

impl VdfObject {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get(&self, key: &str) -> Option<&VdfValue> {
        self.entries
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v)
    }

    pub fn get_mut(&mut self, key: &str) -> Option<&mut VdfValue> {
        self.entries
            .iter_mut()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v)
    }

    /// `obj[key] = value`: substitui mantendo a posição, ou adiciona ao final.
    pub fn insert(&mut self, key: String, value: VdfValue) {
        if let Some(slot) = self.entries.iter_mut().find(|(k, _)| *k == key) {
            slot.1 = value;
        } else {
            self.entries.push((key, value));
        }
    }

    /// `delete obj[key]`. Retorna se a chave existia (`key in obj` do JS).
    pub fn remove(&mut self, key: &str) -> bool {
        let before = self.entries.len();
        self.entries.retain(|(k, _)| k != key);
        self.entries.len() != before
    }

    pub fn iter(&self) -> impl Iterator<Item = (&String, &VdfValue)> {
        self.entries.iter().map(|(k, v)| (k, v))
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

enum Token {
    Str(String),
    Open,
    Close,
}

fn tokenize(text: &str) -> Vec<Token> {
    let bytes = text.as_bytes();
    let len = bytes.len();
    let mut tokens = Vec::new();
    let mut i = 0;

    while i < len {
        let ch = bytes[i];

        // whitespace
        if ch == b' ' || ch == b'\t' || ch == b'\r' || ch == b'\n' {
            i += 1;
            continue;
        }

        // comentário // até o fim da linha (fora de quotes)
        if ch == b'/' && i + 1 < len && bytes[i + 1] == b'/' {
            while i < len && bytes[i] != b'\n' {
                i += 1;
            }
            continue;
        }

        if ch == b'{' {
            tokens.push(Token::Open);
            i += 1;
            continue;
        }

        if ch == b'}' {
            tokens.push(Token::Close);
            i += 1;
            continue;
        }

        if ch == b'"' {
            let mut value: Vec<u8> = Vec::new();
            i += 1;
            while i < len && bytes[i] != b'"' {
                if bytes[i] == b'\\' && i + 1 < len && (bytes[i + 1] == b'"' || bytes[i + 1] == b'\\') {
                    value.push(bytes[i + 1]);
                    i += 2;
                } else {
                    value.push(bytes[i]);
                    i += 1;
                }
            }
            i += 1; // fecha quote
            // Os bytes pulados são ASCII, então o restante continua UTF-8 válido;
            // lossy só por garantia.
            tokens.push(Token::Str(String::from_utf8_lossy(&value).into_owned()));
            continue;
        }

        // token bare (sem quotes) — tolerante, vai até whitespace
        let mut value: Vec<u8> = Vec::new();
        while i < len && !matches!(bytes[i], b' ' | b'\t' | b'\r' | b'\n' | b'{' | b'}') {
            value.push(bytes[i]);
            i += 1;
        }
        if !value.is_empty() {
            tokens.push(Token::Str(String::from_utf8_lossy(&value).into_owned()));
        }
    }

    tokens
}

fn current_mut<'a>(root: &'a mut VdfObject, stack: &'a mut [(Option<String>, VdfObject)]) -> &'a mut VdfObject {
    match stack.last_mut() {
        Some((_, obj)) => obj,
        None => root,
    }
}

/// Parse tolerante (nunca falha), como o `parseVdf` do TS. Blocos anônimos
/// (`{` sem chave pendente) são descartados ao fechar; blocos não fechados
/// no fim do arquivo têm o conteúdo preservado no pai.
pub fn parse_vdf(text: &str) -> VdfObject {
    let mut root = VdfObject::new();
    // Pilha de (chave no pai, objeto aberto) — a inserção no pai acontece no
    // fechamento do bloco (ou no unwind do EOF).
    let mut stack: Vec<(Option<String>, VdfObject)> = Vec::new();
    let mut pending_key: Option<String> = None;

    for token in tokenize(text) {
        match token {
            Token::Str(value) => {
                if let Some(key) = pending_key.take() {
                    current_mut(&mut root, &mut stack).insert(key, VdfValue::Str(value));
                } else {
                    pending_key = Some(value);
                }
            }
            Token::Open => {
                stack.push((pending_key.take(), VdfObject::new()));
            }
            Token::Close => {
                if let Some((key, child)) = stack.pop() {
                    if let Some(key) = key {
                        current_mut(&mut root, &mut stack).insert(key, VdfValue::Object(child));
                    }
                }
                pending_key = None;
            }
        }
    }

    // EOF com blocos abertos: preserva o conteúdo (o TS mantém porque anexa o
    // filho ao pai já no `{`).
    while let Some((key, child)) = stack.pop() {
        if let Some(key) = key {
            current_mut(&mut root, &mut stack).insert(key, VdfValue::Object(child));
        }
    }

    root
}

fn escape_vdf(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn serialize_object(obj: &VdfObject, depth: usize, lines: &mut Vec<String>) {
    let indent = "\t".repeat(depth);
    for (key, value) in obj.iter() {
        match value {
            VdfValue::Str(v) => {
                lines.push(format!("{indent}\"{}\"\t\t\"{}\"", escape_vdf(key), escape_vdf(v)));
            }
            VdfValue::Object(child) => {
                lines.push(format!("{indent}\"{}\"", escape_vdf(key)));
                lines.push(format!("{indent}{{"));
                serialize_object(child, depth + 1, lines);
                lines.push(format!("{indent}}}"));
            }
        }
    }
}

/// Serializa no estilo original dos arquivos do CS2: root sem indentação, filhos com tabs.
pub fn serialize_vdf(root_key: &str, obj: &VdfObject) -> String {
    let mut lines = vec![format!("\"{}\"", escape_vdf(root_key)), "{".to_string()];
    serialize_object(obj, 1, &mut lines);
    lines.push("}".to_string());
    format!("{}\n", lines.join("\n"))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Config de binds real de produção (capturada de uma instalação local),
    /// com CRLF, `<unbound>` e teclas mistas.
    const FIXTURE: &str = include_str!("../tests/fixtures/cs2_user_keys_0_slot0.vcfg");

    fn obj<'a>(obj: &'a VdfObject, key: &str) -> &'a VdfObject {
        match obj.get(key) {
            Some(VdfValue::Object(child)) => child,
            other => panic!("esperava bloco \"{key}\", veio {other:?}"),
        }
    }

    fn str_val<'a>(obj: &'a VdfObject, key: &str) -> &'a str {
        match obj.get(key) {
            Some(VdfValue::Str(value)) => value,
            other => panic!("esperava string \"{key}\", veio {other:?}"),
        }
    }

    #[test]
    fn parses_real_keys_fixture() {
        let parsed = parse_vdf(FIXTURE);
        let config = obj(&parsed, "config");
        let bindings = obj(config, "bindings");
        assert_eq!(str_val(bindings, "SPACE"), "+jump");
        assert_eq!(str_val(bindings, "MOUSE5"), "sv_rethrow_last_grenade 1");
        // 17 binds no arquivo
        assert_eq!(bindings.len(), 17);
    }

    #[test]
    fn preserves_unbound_marker() {
        let parsed = parse_vdf(FIXTURE);
        let bindings = obj(obj(&parsed, "config"), "bindings");
        assert_eq!(str_val(bindings, "7"), "<unbound>");
        assert_eq!(str_val(bindings, "z"), "<unbound>");
    }

    #[test]
    fn round_trip_is_idempotent() {
        let parsed = parse_vdf(FIXTURE);
        let config = obj(&parsed, "config");
        let serialized = serialize_vdf("config", config);
        // parse(serialize(parse(x))) == parse(x)
        let reparsed = parse_vdf(&serialized);
        assert_eq!(parsed, reparsed);
        // serialize é ponto fixo: serialize(parse(serialize(...))) == serialize(...)
        let serialized_again = serialize_vdf("config", obj(&reparsed, "config"));
        assert_eq!(serialized, serialized_again);
    }

    #[test]
    fn round_trip_matches_original_shape() {
        // O arquivo original usa exatamente o estilo do serializador
        // (tabs, `\t\t` entre chave e valor) — só muda CRLF → LF.
        let parsed = parse_vdf(FIXTURE);
        let serialized = serialize_vdf("config", obj(&parsed, "config"));
        assert_eq!(serialized, FIXTURE.replace("\r\n", "\n"));
    }

    #[test]
    fn skips_line_comments() {
        let parsed = parse_vdf("// comentário inicial\n\"root\"\n{\n\t\"a\"\t\t\"1\" // depois do par\n\t// \"b\"\t\t\"2\"\n\t\"c\"\t\t\"3\"\n}\n");
        let root = obj(&parsed, "root");
        assert_eq!(root.len(), 2);
        assert_eq!(str_val(root, "a"), "1");
        assert_eq!(str_val(root, "c"), "3");
    }

    #[test]
    fn unescapes_quotes_and_backslashes() {
        let parsed = parse_vdf("\"root\" { \"say\" \"olá \\\"mundo\\\" \\\\ fim\" }");
        assert_eq!(str_val(obj(&parsed, "root"), "say"), "olá \"mundo\" \\ fim");
    }

    #[test]
    fn serializer_escapes_quotes_and_backslashes() {
        let mut root = VdfObject::new();
        root.insert("a\\b\"c".to_string(), VdfValue::Str("v\\\"x".to_string()));
        let out = serialize_vdf("root", &root);
        assert_eq!(out, "\"root\"\n{\n\t\"a\\\\b\\\"c\"\t\t\"v\\\\\\\"x\"\n}\n");
        // e o escape é simétrico no parse
        let reparsed = parse_vdf(&out);
        assert_eq!(str_val(obj(&reparsed, "root"), "a\\b\"c"), "v\\\"x");
    }

    #[test]
    fn duplicate_keys_keep_last_value() {
        let parsed = parse_vdf("\"root\" { \"k\" \"1\" \"k\" \"2\" }");
        let root = obj(&parsed, "root");
        assert_eq!(root.len(), 1);
        assert_eq!(str_val(root, "k"), "2");
    }

    #[test]
    fn duplicate_keys_keep_first_position() {
        // `obj[key] = value` do JS mantém a posição original da chave.
        let parsed = parse_vdf("\"root\" { \"a\" \"1\" \"b\" \"2\" \"a\" \"3\" }");
        let root = obj(&parsed, "root");
        let keys: Vec<&str> = root.iter().map(|(k, _)| k.as_str()).collect();
        assert_eq!(keys, ["a", "b"]);
        assert_eq!(str_val(root, "a"), "3");
    }

    #[test]
    fn tolerates_bare_tokens_and_quoted_escapes() {
        // chave bare (sem quotes) + valor quoted com escape `\\` → `\`
        let parsed = parse_vdf("libraryfolders\n{\n\t0\n\t{\n\t\tpath\t\t\"D:\\\\SteamLibrary\"\n\t}\n}\n");
        let root = obj(&parsed, "libraryfolders");
        assert_eq!(str_val(obj(root, "0"), "path"), "D:\\SteamLibrary");
    }

    #[test]
    fn tolerates_unclosed_blocks() {
        let parsed = parse_vdf("\"root\" { \"a\" \"1\" \"sub\" { \"b\" \"2\"");
        let root = obj(&parsed, "root");
        assert_eq!(str_val(root, "a"), "1");
        assert_eq!(str_val(obj(root, "sub"), "b"), "2");
    }

    #[test]
    fn empty_input_yields_empty_object() {
        assert!(parse_vdf("").is_empty());
        assert!(parse_vdf("  \n\t\r\n ").is_empty());
    }
}
