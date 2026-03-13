use crate::document::{word_at, TextDocument};
use regex::Regex;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tower_lsp::lsp_types::{Location, Position, Range, TextEdit, Url};
use walkdir::WalkDir;

pub fn find_references(root: Option<Url>, doc: Option<&TextDocument>, pos: Position) -> Vec<Location> {
    let mut locations = Vec::new();
    let doc = match doc {
        Some(d) => d,
        None => return locations,
    };
    let word = match word_at(doc, pos) {
        Some(w) => w,
        None => return locations,
    };

    let root = match root {
        Some(r) => r,
        None => return locations,
    };
    let root_path: PathBuf = match root.to_file_path() {
        Ok(p) => p,
        Err(_) => return locations,
    };

    let re = Regex::new(&format!(r"\b{}\b", word)).unwrap();
    for entry in WalkDir::new(root_path).into_iter().filter_map(|e| e.ok()) {
        if entry.path().extension().and_then(|s| s.to_str()) != Some("kor") {
            continue;
        }
        let text = match fs::read_to_string(entry.path()) {
            Ok(t) => t,
            Err(_) => continue,
        };
        for (line_idx, line) in text.lines().enumerate() {
            for m in re.find_iter(line) {
                let uri = Url::from_file_path(entry.path()).ok();
                if let Some(uri) = uri {
                    locations.push(Location {
                        uri,
                        range: Range {
                            start: Position { line: line_idx as u32, character: m.start() as u32 },
                            end: Position { line: line_idx as u32, character: m.end() as u32 },
                        },
                    });
                }
            }
        }
    }

    locations
}

pub fn rename_symbol(root: Option<Url>, doc: Option<&TextDocument>, pos: Position, new_name: &str) -> HashMap<Url, Vec<TextEdit>> {
    let mut edits: HashMap<Url, Vec<TextEdit>> = HashMap::new();
    let locations = find_references(root, doc, pos);
    for loc in locations {
        edits.entry(loc.uri).or_default().push(TextEdit {
            range: loc.range,
            new_text: new_name.to_string(),
        });
    }
    edits
}
