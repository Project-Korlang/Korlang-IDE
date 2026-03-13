use crate::document::TextDocument;
use tower_lsp::lsp_types::{Position, Range, TextEdit};

pub fn format_document(doc: Option<&TextDocument>) -> Option<Vec<TextEdit>> {
    let doc = doc?;
    let input = doc.text.clone();
    let output = std::process::Command::new("korlang")
        .arg("fmt")
        .arg("--stdin")
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .spawn();

    if let Ok(mut child) = output {
        if let Some(mut stdin) = child.stdin.take() {
            let _ = std::io::Write::write_all(&mut stdin, input.as_bytes());
        }
        if let Ok(output) = child.wait_with_output() {
            if output.status.success() {
                let formatted = String::from_utf8_lossy(&output.stdout).to_string();
                let end_line = doc.text.lines().count().saturating_sub(1) as u32;
                let end_char = doc.text.lines().last().map(|l| l.len() as u32).unwrap_or(0);
                return Some(vec![TextEdit {
                    range: Range {
                        start: Position { line: 0, character: 0 },
                        end: Position { line: end_line, character: end_char },
                    },
                    new_text: formatted,
                }]);
            }
        }
    }

    None
}
