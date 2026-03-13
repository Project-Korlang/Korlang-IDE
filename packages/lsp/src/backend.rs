use crate::completion::completion_items;
use crate::definition::find_definition;
use crate::diagnostics::run_diagnostics;
use crate::document::{DocumentStore, SymbolKindEx, TextDocument};
use crate::formatting::format_document;
use crate::hover::hover_for_position;
use crate::references::find_references;
use crate::symbols::{document_symbols, workspace_symbols};
use dashmap::DashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
use tower_lsp::jsonrpc::Result;
use tower_lsp::lsp_types::*;
use tower_lsp::{Client, LanguageServer};

pub struct Backend {
    pub client: Client,
    pub documents: Arc<DocumentStore>,
    pub workspace_root: Arc<Mutex<Option<Url>>>,
    pub debounce: Arc<Mutex<DashMap<Url, Instant>>>,
    pub compiler_path: Arc<Mutex<String>>,
}

impl Backend {
    pub fn new(client: Client) -> Self {
        Self {
            client,
            documents: Arc::new(DocumentStore::new()),
            workspace_root: Arc::new(Mutex::new(None)),
            debounce: Arc::new(Mutex::new(DashMap::new())),
            compiler_path: Arc::new(Mutex::new("korlang".to_string())),
        }
    }

    async fn schedule_diagnostics(&self, uri: Url) {
        let debounce = self.debounce.clone();
        debounce.lock().await.insert(uri.clone(), Instant::now());
        let documents = self.documents.clone();
        let client = self.client.clone();
        let compiler_path = self.compiler_path.clone();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(300)).await;
            let last = debounce.lock().await.get(&uri).map(|v| *v);
            if last.is_none() {
                return;
            }
            let last = last.unwrap();
            if last.elapsed() < Duration::from_millis(290) {
                return;
            }
            debounce.lock().await.remove(&uri);
            if let Some(doc) = documents.get(&uri) {
                let compiler = compiler_path.lock().await.clone();
                let diags = run_diagnostics(&compiler, &uri, &doc).await;
                let _ = client.publish_diagnostics(uri, diags, Some(doc.version)).await;
            }
        });
    }
}

#[tower_lsp::async_trait]
impl LanguageServer for Backend {
    async fn initialize(&self, params: InitializeParams) -> Result<InitializeResult> {
        if let Some(root) = params.root_uri.clone() {
            *self.workspace_root.lock().await = Some(root);
        }
        if let Some(opts) = params.initialization_options {
            if let Some(path) = opts.get("compilerPath").and_then(|v| v.as_str()) {
                *self.compiler_path.lock().await = path.to_string();
            }
        }

        let capabilities = ServerCapabilities {
            text_document_sync: Some(TextDocumentSyncCapability::Kind(
                TextDocumentSyncKind::FULL,
            )),
            completion_provider: Some(CompletionOptions {
                resolve_provider: Some(false),
                trigger_characters: Some(vec![".".into(), "::".into(), "(".into()]),
                ..Default::default()
            }),
            hover_provider: Some(HoverProviderCapability::Simple(true)),
            definition_provider: Some(OneOf::Left(true)),
            references_provider: Some(OneOf::Left(true)),
            document_symbol_provider: Some(OneOf::Left(true)),
            workspace_symbol_provider: Some(OneOf::Left(true)),
            document_formatting_provider: Some(OneOf::Left(true)),
            code_action_provider: Some(CodeActionProviderCapability::Simple(true)),
            rename_provider: Some(OneOf::Left(true)),
            signature_help_provider: Some(SignatureHelpOptions {
                trigger_characters: Some(vec!["(".into(), ",".into()]),
                retrigger_characters: Some(vec![",".into()]),
                ..Default::default()
            }),
            ..Default::default()
        };

        Ok(InitializeResult {
            capabilities,
            server_info: Some(ServerInfo {
                name: "korlang-lsp".into(),
                version: Some("0.1.0".into()),
            }),
        })
    }

    async fn initialized(&self, _: InitializedParams) {
        let _ = self.client.log_message(MessageType::INFO, "Korlang LSP initialized").await;
    }

    async fn shutdown(&self) -> Result<()> {
        Ok(())
    }

    async fn did_open(&self, params: DidOpenTextDocumentParams) {
        let doc = TextDocument::from(params.text_document);
        self.documents.open(doc.clone());
        self.schedule_diagnostics(doc.uri).await;
    }

    async fn did_change(&self, params: DidChangeTextDocumentParams) {
        if let Some(change) = params.content_changes.into_iter().last() {
            self.documents.update(&params.text_document.uri, params.text_document.version, change.text);
            self.schedule_diagnostics(params.text_document.uri).await;
        }
    }

    async fn did_close(&self, params: DidCloseTextDocumentParams) {
        self.documents.close(&params.text_document.uri);
        let _ = self.client.publish_diagnostics(params.text_document.uri, vec![], None).await;
    }

    async fn completion(&self, params: CompletionParams) -> Result<Option<CompletionResponse>> {
        let uri = params.text_document_position.text_document.uri;
        let pos = params.text_document_position.position;
        let doc = self.documents.get(&uri);
        let items = completion_items(doc.as_deref(), pos);
        Ok(Some(CompletionResponse::Array(items)))
    }

    async fn hover(&self, params: HoverParams) -> Result<Option<Hover>> {
        let uri = params.text_document_position_params.text_document.uri;
        let pos = params.text_document_position_params.position;
        let doc = self.documents.get(&uri);
        Ok(hover_for_position(doc.as_deref(), pos))
    }

    async fn goto_definition(&self, params: GotoDefinitionParams) -> Result<Option<GotoDefinitionResponse>> {
        let uri = params.text_document_position_params.text_document.uri;
        let pos = params.text_document_position_params.position;
        let root = self.workspace_root.lock().await.clone();
        let doc = self.documents.get(&uri);
        Ok(find_definition(root, doc.as_deref(), pos).map(GotoDefinitionResponse::Scalar))
    }

    async fn references(&self, params: ReferenceParams) -> Result<Option<Vec<Location>>> {
        let uri = params.text_document_position.text_document.uri;
        let pos = params.text_document_position.position;
        let root = self.workspace_root.lock().await.clone();
        let doc = self.documents.get(&uri);
        Ok(Some(find_references(root, doc.as_deref(), pos)))
    }

    async fn document_symbol(&self, params: DocumentSymbolParams) -> Result<Option<DocumentSymbolResponse>> {
        let uri = params.text_document.uri;
        let doc = self.documents.get(&uri);
        if let Some(doc) = doc {
            let symbols = document_symbols(&doc);
            Ok(Some(DocumentSymbolResponse::Nested(symbols)))
        } else {
            Ok(None)
        }
    }

    async fn workspace_symbol(&self, params: WorkspaceSymbolParams) -> Result<Option<Vec<SymbolInformation>>> {
        let root = self.workspace_root.lock().await.clone();
        Ok(Some(workspace_symbols(root, &params.query)))
    }

    async fn formatting(&self, params: DocumentFormattingParams) -> Result<Option<Vec<TextEdit>>> {
        let uri = params.text_document.uri;
        let doc = self.documents.get(&uri);
        Ok(format_document(doc.as_deref()))
    }

    async fn code_action(&self, params: CodeActionParams) -> Result<Option<CodeActionResponse>> {
        let mut actions = vec![];
        let uri = params.text_document.uri;
        let range = params.range;

        actions.push(CodeActionOrCommand::CodeAction(CodeAction {
            title: "Add missing import".into(),
            kind: Some(CodeActionKind::QUICKFIX),
            edit: Some(WorkspaceEdit {
                changes: Some([(uri.clone(), vec![TextEdit {
                    range: Range {
                        start: Position { line: 0, character: 0 },
                        end: Position { line: 0, character: 0 },
                    },
                    new_text: "import std::*;\n".into(),
                }])].into_iter().collect()),
                ..Default::default()
            }),
            ..Default::default()
        }));

        actions.push(CodeActionOrCommand::CodeAction(CodeAction {
            title: "Fix type mismatch".into(),
            kind: Some(CodeActionKind::QUICKFIX),
            edit: Some(WorkspaceEdit {
                changes: Some([(uri.clone(), vec![TextEdit {
                    range,
                    new_text: "/* TODO: fix type */".into(),
                }])].into_iter().collect()),
                ..Default::default()
            }),
            ..Default::default()
        }));

        actions.push(CodeActionOrCommand::CodeAction(CodeAction {
            title: "Remove unused variable".into(),
            kind: Some(CodeActionKind::QUICKFIX),
            edit: Some(WorkspaceEdit {
                changes: Some([(uri, vec![TextEdit {
                    range,
                    new_text: "".into(),
                }])].into_iter().collect()),
                ..Default::default()
            }),
            ..Default::default()
        }));

        Ok(Some(actions))
    }

    async fn rename(&self, params: RenameParams) -> Result<Option<WorkspaceEdit>> {
        let uri = params.text_document_position.text_document.uri;
        let pos = params.text_document_position.position;
        let root = self.workspace_root.lock().await.clone();
        let doc = self.documents.get(&uri);
        let edits = crate::references::rename_symbol(root, doc.as_deref(), pos, &params.new_name);
        Ok(Some(WorkspaceEdit { changes: Some(edits), ..Default::default() }))
    }

    async fn signature_help(&self, params: SignatureHelpParams) -> Result<Option<SignatureHelp>> {
        let uri = params.text_document_position_params.text_document.uri;
        let pos = params.text_document_position_params.position;
        let doc = self.documents.get(&uri);
        Ok(crate::hover::signature_help(doc.as_deref(), pos))
    }
}

impl SymbolKindEx for SymbolKind {
    fn as_completion_kind(&self) -> CompletionItemKind {
        match self {
            SymbolKind::FUNCTION => CompletionItemKind::FUNCTION,
            SymbolKind::STRUCT => CompletionItemKind::STRUCT,
            SymbolKind::ENUM => CompletionItemKind::ENUM,
            SymbolKind::CLASS => CompletionItemKind::CLASS,
            SymbolKind::CONSTANT => CompletionItemKind::CONSTANT,
            SymbolKind::VARIABLE => CompletionItemKind::VARIABLE,
            _ => CompletionItemKind::TEXT,
        }
    }
}
