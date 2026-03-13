use crate::document::TextDocument;
use serde_json::Value;
use std::path::PathBuf;
use tokio::process::Command;
use tower_lsp::lsp_types::{Diagnostic, DiagnosticSeverity, Position, Range, Url};

fn severity_from_level(level: &str) -> DiagnosticSeverity {
    match level {
        "error" => DiagnosticSeverity::ERROR,
        "warning" => DiagnosticSeverity::WARNING,
        "info" => DiagnosticSeverity::INFORMATION,
        _ => DiagnosticSeverity::HINT,
    }
}

fn default_range(doc: &TextDocument) -> Range {
    let last_line = doc.text.lines().count().saturating_sub(1) as u32;
    Range {
        start: Position { line: last_line, character: 0 },
        end: Position { line: last_line, character: 0 },
    }
}

pub async fn run_diagnostics(compiler: &str, uri: &Url, doc: &TextDocument) -> Vec<Diagnostic> {
    let path: PathBuf = match uri.to_file_path() {
        Ok(p) => p,
        Err(_) => return vec![],
    };

    let output = Command::new(compiler)
        .arg("check")
        .arg("--json")
        .arg(&path)
        .output()
        .await;

    let output = match output {
        Ok(o) => o,
        Err(_) => return vec![],
    };

    let value: Value = match serde_json::from_slice(&output.stdout) {
        Ok(v) => v,
        Err(_) => return vec![],
    };

    let mut diagnostics = vec![];
    let items = value.as_array().cloned().unwrap_or_default();
    for item in items {
        let message = item.get("message").and_then(|v| v.as_str()).unwrap_or("Unknown error");
        let level = item.get("level").and_then(|v| v.as_str()).unwrap_or("error");
        let span = item.get("span");
        let range = if let Some(span) = span {
            let start = span.get("start");
            let end = span.get("end");
            let start = Position {
                line: start.and_then(|v| v.get("line")).and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                character: start.and_then(|v| v.get("col")).and_then(|v| v.as_u64()).unwrap_or(0) as u32,
            };
            let end = Position {
                line: end.and_then(|v| v.get("line")).and_then(|v| v.as_u64()).unwrap_or(start.line as u64) as u32,
                character: end.and_then(|v| v.get("col")).and_then(|v| v.as_u64()).unwrap_or(start.character as u64) as u32,
            };
            Range { start, end }
        } else {
            default_range(doc)
        };

        diagnostics.push(Diagnostic {
            range,
            severity: Some(severity_from_level(level)),
            message: message.to_string(),
            source: Some("korlang".into()),
            ..Default::default()
        });
    }

    diagnostics
}
