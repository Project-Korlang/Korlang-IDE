use crate::document::{parse_symbols, TextDocument};
use std::fs;
use std::path::PathBuf;
use tower_lsp::lsp_types::{DocumentSymbol, Position, Range, SymbolInformation, SymbolKind, Url};
use walkdir::WalkDir;

pub fn document_symbols(doc: &TextDocument) -> Vec<DocumentSymbol> {
    parse_symbols(doc)
        .into_iter()
        .map(|s| DocumentSymbol {
            name: s.name,
            detail: s.detail,
            kind: s.kind,
            range: Range {
                start: Position { line: s.line, character: 0 },
                end: Position { line: s.line, character: 0 },
            },
            selection_range: Range {
                start: Position { line: s.line, character: s.character },
                end: Position { line: s.line, character: s.character + 1 },
            },
            children: None,
            tags: None,
            deprecated: None,
        })
        .collect()
}

pub fn workspace_symbols(root: Option<Url>, query: &str) -> Vec<SymbolInformation> {
    let mut items = Vec::new();
    let root = match root {
        Some(r) => r,
        None => return items,
    };
    let root_path: PathBuf = match root.to_file_path() {
        Ok(p) => p,
        Err(_) => return items,
    };
    for entry in WalkDir::new(root_path).into_iter().filter_map(|e| e.ok()) {
        if entry.path().extension().and_then(|s| s.to_str()) != Some("kor") {
            continue;
        }
        let text = match fs::read_to_string(entry.path()) {
            Ok(t) => t,
            Err(_) => continue,
        };
        let doc = TextDocument {
            uri: Url::from_file_path(entry.path()).ok().unwrap(),
            version: 0,
            text,
        };
        for sym in parse_symbols(&doc) {
            if !query.is_empty() && !sym.name.contains(query) {
                continue;
            }
            items.push(SymbolInformation {
                name: sym.name,
                kind: sym.kind,
                location: tower_lsp::lsp_types::Location {
                    uri: doc.uri.clone(),
                    range: Range {
                        start: Position { line: sym.line, character: 0 },
                        end: Position { line: sym.line, character: 0 },
                    },
                },
                tags: None,
                deprecated: None,
                container_name: None,
            });
        }
    }

    items
}
