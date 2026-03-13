use crate::document::{parse_symbols, word_at, TextDocument};
use regex::Regex;
use std::fs;
use std::path::PathBuf;
use tower_lsp::lsp_types::{Location, Position, Range, Url};
use walkdir::WalkDir;

pub fn find_definition(root: Option<Url>, doc: Option<&TextDocument>, pos: Position) -> Option<Location> {
    let doc = doc?;
    let word = word_at(doc, pos)?;
    for sym in parse_symbols(doc) {
        if sym.name == word {
            return Some(Location {
                uri: doc.uri.clone(),
                range: Range {
                    start: Position { line: sym.line, character: sym.character },
                    end: Position { line: sym.line, character: sym.character + sym.name.len() as u32 },
                },
            });
        }
    }

    let root = root?;
    let root_path: PathBuf = root.to_file_path().ok()?;
    let re = Regex::new(&format!(r"\b(fn|struct|enum|type|const|let)\s+{}\b", word)).ok()?;
    for entry in WalkDir::new(root_path).into_iter().filter_map(|e| e.ok()) {
        if entry.path().extension().and_then(|s| s.to_str()) != Some("kor") {
            continue;
        }
        let text = fs::read_to_string(entry.path()).ok()?;
        for (line_idx, line) in text.lines().enumerate() {
            if re.is_match(line) {
                let uri = Url::from_file_path(entry.path()).ok()?;
                return Some(Location {
                    uri,
                    range: Range {
                        start: Position { line: line_idx as u32, character: 0 },
                        end: Position { line: line_idx as u32, character: line.len() as u32 },
                    },
                });
            }
        }
    }
    None
}
