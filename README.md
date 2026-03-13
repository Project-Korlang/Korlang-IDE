# Korlang-IDE

Korlang-IDE is the official integrated development environment for the Korlang programming language. This monorepo ships a shared Rust Language Server (LSP), a VS Code extension, and a standalone Electron IDE. Both IDE surfaces are thin shells over the same language intelligence.

## Architecture Overview

- **Language Server (Rust)**: `packages/lsp` builds the `korlang-lsp` binary using `tower-lsp`. It exposes LSP over **stdio** (default) or **TCP** (optional). Diagnostics, completions, hovers, go-to-definition, references, symbols, formatting, code actions, rename, and signature help are implemented against the Korlang compiler CLI (`korlang`) and a lightweight workspace index.
- **VS Code Extension**: `packages/vscode-extension` launches the shared LSP server and contributes syntax highlighting, snippets, commands, keybindings, and a KPM webview.
- **Electron IDE**: `packages/electron-ide` bundles a React UI, CodeMirror 6 editor, xterm.js terminal, and an LSP client. It spawns `korlang-lsp` and connects via stdio.

The LSP server is a standalone Rust binary. Both the VS Code extension and the Electron IDE connect to it, so language intelligence is consistent across platforms.

## Repo Layout

```
Korlang-IDE/
+-- packages/
¦   +-- lsp/              # Language Server (Rust, tower-lsp)
¦   +-- vscode-extension/ # VS Code Extension (TypeScript)
¦   +-- electron-ide/     # Standalone IDE (Electron + React + CodeMirror 6)
+-- .github/workflows/    # CI/CD
+-- Cargo.toml            # Rust workspace
+-- package.json          # Monorepo root (pnpm workspaces)
+-- README.md
```

## Setup & Run

1. Install dependencies
   - `pnpm install`
   - `cargo build -p korlang-lsp`

2. Start Electron IDE (dev)
   - `pnpm -C packages/electron-ide dev`

3. Build VS Code extension
   - `pnpm -C packages/vscode-extension build`
   - `pnpm -C packages/vscode-extension package`
   - Install the generated `.vsix` from `packages/vscode-extension/dist`.

4. Run LSP manually
   - `cargo run -p korlang-lsp -- --stdio`
   - `cargo run -p korlang-lsp -- --tcp 127.0.0.1:9257`

## Requirements

- Node.js 18+
- pnpm 9+
- Rust 1.74+
- Korlang compiler in PATH (`korlang`)
