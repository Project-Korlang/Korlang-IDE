mod backend;
mod completion;
mod definition;
mod diagnostics;
mod document;
mod formatting;
mod hover;
mod references;
mod symbols;

use backend::Backend;
use std::env;
use tokio::net::TcpListener;
use tower_lsp::LspService;
use tower_lsp::Server;

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();
    let mode = args.iter().skip(1).find(|v| v.as_str() == "--tcp");

    if let Some(_) = mode {
        let addr = args.iter().skip_while(|v| v.as_str() != "--tcp").nth(1).cloned().unwrap_or_else(|| "127.0.0.1:9257".into());
        let listener = TcpListener::bind(&addr).await.expect("Failed to bind TCP");
        loop {
            let (stream, _) = listener.accept().await.expect("Failed to accept");
            let (read, write) = tokio::io::split(stream);
            let (service, socket) = LspService::new(|client| Backend::new(client));
            Server::new(read, write, socket).serve(service).await;
        }
    } else {
        let (service, socket) = LspService::new(|client| Backend::new(client));
        Server::new(tokio::io::stdin(), tokio::io::stdout(), socket).serve(service).await;
    }
}
