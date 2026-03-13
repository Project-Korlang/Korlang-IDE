use crate::document::{parse_symbols, word_at, TextDocument};
use regex::Regex;
use tower_lsp::lsp_types::{Hover, HoverContents, MarkedString, Position, Range, SignatureHelp, SignatureInformation};

pub fn hover_for_position(doc: Option<&TextDocument>, pos: Position) -> Option<Hover> {
    let doc = doc?;
    let word = word_at(doc, pos)?;
    let symbols = parse_symbols(doc);
    let symbol = symbols.into_iter().find(|s| s.name == word)?;

    let mut parts = vec![];
    if let Some(detail) = symbol.detail {
        parts.push(MarkedString::String(detail));
    }
    if let Some(docs) = symbol.docs {
        parts.push(MarkedString::String(docs));
    }
    if parts.is_empty() {
        return None;
    }

    Some(Hover {
        contents: HoverContents::Array(parts),
        range: Some(Range {
            start: Position { line: symbol.line, character: symbol.character },
            end: Position { line: symbol.line, character: symbol.character + symbol.name.len() as u32 },
        }),
    })
}

pub fn signature_help(doc: Option<&TextDocument>, pos: Position) -> Option<SignatureHelp> {
    let doc = doc?;
    let line = doc.line(pos.line as usize)?;
    let re = Regex::new(r"fn\s+(?P<name>[A-Za-z_][A-Za-z0-9_]*)\s*\((?P<args>[^)]*)\)").unwrap();
    for cap in re.captures_iter(line) {
        let name = cap["name"].to_string();
        let args = cap["args"].trim();
        let label = if args.is_empty() {
            format!("{}()", name)
        } else {
            format!("{}({})", name, args)
        };
        return Some(SignatureHelp {
            signatures: vec![SignatureInformation {
                label,
                documentation: None,
                parameters: None,
                active_parameter: None,
            }],
            active_signature: Some(0),
            active_parameter: Some(0),
        });
    }
    None
}
