use dashmap::DashMap;
use regex::Regex;
use tower_lsp::lsp_types::{Position, SymbolKind, TextDocumentItem, Url};

#[derive(Clone, Debug)]
pub struct TextDocument {
    pub uri: Url,
    pub version: i32,
    pub text: String,
}

impl TextDocument {
    pub fn from(item: TextDocumentItem) -> Self {
        Self {
            uri: item.uri,
            version: item.version,
            text: item.text,
        }
    }

    pub fn line(&self, line: usize) -> Option<&str> {
        self.text.lines().nth(line)
    }
}

pub struct DocumentStore {
    docs: DashMap<Url, TextDocument>,
}

impl DocumentStore {
    pub fn new() -> Self {
        Self { docs: DashMap::new() }
    }

    pub fn open(&self, doc: TextDocument) {
        self.docs.insert(doc.uri.clone(), doc);
    }

    pub fn update(&self, uri: &Url, version: i32, text: String) {
        self.docs.insert(uri.clone(), TextDocument { uri: uri.clone(), version, text });
    }

    pub fn close(&self, uri: &Url) {
        self.docs.remove(uri);
    }

    pub fn get(&self, uri: &Url) -> Option<TextDocument> {
        self.docs.get(uri).map(|v| v.clone())
    }
}

pub trait SymbolKindEx {
    fn as_completion_kind(&self) -> tower_lsp::lsp_types::CompletionItemKind;
}

#[derive(Clone, Debug)]
pub struct DocumentSymbolInfo {
    pub name: String,
    pub kind: SymbolKind,
    pub line: u32,
    pub character: u32,
    pub docs: Option<String>,
    pub detail: Option<String>,
}

pub fn parse_symbols(doc: &TextDocument) -> Vec<DocumentSymbolInfo> {
    let mut symbols = Vec::new();
    let re = Regex::new(r"^(?P<vis>pub\s+)?(?P<kind>fn|struct|enum|type|const|let)\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)").unwrap();

    let mut last_doc: Option<String> = None;
    for (i, line) in doc.text.lines().enumerate() {
        let trimmed = line.trim();
        if trimmed.starts_with("///") {
            let doc_line = trimmed.trim_start_matches("///").trim();
            let entry = last_doc.get_or_insert_with(String::new);
            if !entry.is_empty() {
                entry.push('\n');
            }
            entry.push_str(doc_line);
            continue;
        }
        if let Some(caps) = re.captures(trimmed) {
            let name = caps["name"].to_string();
            let kind = match &caps["kind"] {
                "fn" => SymbolKind::FUNCTION,
                "struct" => SymbolKind::STRUCT,
                "enum" => SymbolKind::ENUM,
                "type" => SymbolKind::TYPE_PARAMETER,
                "const" => SymbolKind::CONSTANT,
                "let" => SymbolKind::VARIABLE,
                _ => SymbolKind::VARIABLE,
            };
            let detail = trimmed.split('{').next().map(|v| v.trim().to_string());
            symbols.push(DocumentSymbolInfo {
                name,
                kind,
                line: i as u32,
                character: 0,
                docs: last_doc.take(),
                detail,
            });
        } else {
            last_doc = None;
        }
    }

    symbols
}

pub fn word_at(doc: &TextDocument, pos: Position) -> Option<String> {
    let line = doc.line(pos.line as usize)?;
    let mut start = pos.character as isize;
    let mut end = pos.character as isize;
    let chars: Vec<char> = line.chars().collect();
    while start > 0 {
        let c = chars.get((start - 1) as usize)?;
        if c.is_alphanumeric() || *c == '_' {
            start -= 1;
        } else {
            break;
        }
    }
    while (end as usize) < chars.len() {
        let c = chars.get(end as usize)?;
        if c.is_alphanumeric() || *c == '_' {
            end += 1;
        } else {
            break;
        }
    }
    if start == end {
        return None;
    }
    Some(chars[start as usize..end as usize].iter().collect())
}

pub fn position_to_offset(doc: &TextDocument, pos: Position) -> usize {
    let mut offset = 0usize;
    for (i, line) in doc.text.lines().enumerate() {
        if i == pos.line as usize {
            offset += pos.character as usize;
            break;
        } else {
            offset += line.len() + 1;
        }
    }
    offset
}
