use korlang_lsp::document::TextDocument;
use korlang_lsp::completion::completion_items;
use korlang_lsp::hover::hover_for_position;
use korlang_lsp::definition::find_definition;
use korlang_lsp::references::find_references;
use korlang_lsp::symbols::{document_symbols, workspace_symbols};
use tempfile::tempdir;
use tower_lsp::lsp_types::{Position, Url};
use std::fs;

#[tokio::test]
async fn test_completion_basic() {
    let doc = TextDocument {
        uri: Url::parse("file:///test.kor").unwrap(),
        version: 1,
        text: "fn foo() {}".into(),
    };
    let items = completion_items(Some(&doc), Position { line: 0, character: 3 });
    assert!(items.iter().any(|i| i.label == "foo"));
}

#[tokio::test]
async fn test_hover() {
    let doc = TextDocument {
        uri: Url::parse("file:///test.kor").unwrap(),
        version: 1,
        text: "/// Doc\nfn foo() {}".into(),
    };
    let hover = hover_for_position(Some(&doc), Position { line: 1, character: 4 });
    assert!(hover.is_some());
}

#[tokio::test]
async fn test_definition_and_references() {
    let dir = tempdir().unwrap();
    let file = dir.path().join("main.kor");
    fs::write(&file, "fn foo() {}\nfn bar() { foo(); }").unwrap();

    let doc = TextDocument {
        uri: Url::from_file_path(&file).unwrap(),
        version: 1,
        text: fs::read_to_string(&file).unwrap(),
    };

    let def = find_definition(Some(Url::from_file_path(dir.path()).unwrap()), Some(&doc), Position { line: 1, character: 12 });
    assert!(def.is_some());

    let refs = find_references(Some(Url::from_file_path(dir.path()).unwrap()), Some(&doc), Position { line: 1, character: 12 });
    assert!(refs.len() >= 1);
}

#[tokio::test]
async fn test_symbols() {
    let doc = TextDocument {
        uri: Url::parse("file:///test.kor").unwrap(),
        version: 1,
        text: "struct Foo {}\nfn bar() {}".into(),
    };
    let symbols = document_symbols(&doc);
    assert_eq!(symbols.len(), 2);
}

#[tokio::test]
async fn test_workspace_symbols() {
    let dir = tempdir().unwrap();
    let file = dir.path().join("lib.kor");
    fs::write(&file, "fn alpha() {}\nfn beta() {}").unwrap();
    let items = workspace_symbols(Some(Url::from_file_path(dir.path()).unwrap()), "alpha");
    assert!(items.iter().any(|i| i.name == "alpha"));
}
