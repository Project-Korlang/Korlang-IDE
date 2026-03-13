use crate::document::{parse_symbols, SymbolKindEx, TextDocument};
use tower_lsp::lsp_types::{CompletionItem, CompletionItemKind, InsertTextFormat, Position};

const STDLIB: &[(&str, &str)] = &[
    ("print", "Prints a value to stdout."),
    ("println", "Prints a value with newline."),
    ("Vec", "Growable vector type."),
    ("Map", "Hash map type."),
    ("String", "UTF-8 string type."),
    ("Option", "Optional value type."),
    ("Result", "Result type for fallible operations."),
    ("range", "Iterator from start to end."),
];

const KPM_PACKAGES: &[&str] = &["http", "json", "rand", "time", "math", "fs", "cli"];

pub fn completion_items(doc: Option<&TextDocument>, _pos: Position) -> Vec<CompletionItem> {
    let mut items = Vec::new();

    for (name, doc) in STDLIB {
        items.push(CompletionItem {
            label: name.to_string(),
            kind: Some(CompletionItemKind::FUNCTION),
            detail: Some("Korlang stdlib".into()),
            documentation: Some(tower_lsp::lsp_types::Documentation::String(doc.to_string())),
            ..Default::default()
        });
    }

    for pkg in KPM_PACKAGES {
        items.push(CompletionItem {
            label: pkg.to_string(),
            kind: Some(CompletionItemKind::MODULE),
            detail: Some("KPM package".into()),
            ..Default::default()
        });
    }

    if let Some(doc) = doc {
        for sym in parse_symbols(doc) {
            items.push(CompletionItem {
                label: sym.name.clone(),
                kind: Some(sym.kind.as_completion_kind()),
                detail: sym.detail.clone(),
                documentation: sym.docs.map(tower_lsp::lsp_types::Documentation::String),
                ..Default::default()
            });
        }
    }

    let snippets = vec![
        ("fn", "fn ${1:name}(${2:args}) -> ${3:Type} {\n    ${0}\n}", "Function"),
        ("struct", "struct ${1:Name} {\n    ${0}\n}", "Struct"),
        ("match", "match ${1:expr} {\n    ${0}\n}", "Match"),
        ("if", "if ${1:condition} {\n    ${0}\n}", "If"),
        ("ifelse", "if ${1:condition} {\n    ${2}\n} else {\n    ${0}\n}", "If/Else"),
    ];

    for (label, body, detail) in snippets {
        items.push(CompletionItem {
            label: label.into(),
            kind: Some(CompletionItemKind::SNIPPET),
            insert_text_format: Some(InsertTextFormat::SNIPPET),
            detail: Some(detail.into()),
            insert_text: Some(body.into()),
            ..Default::default()
        });
    }

    items
}
