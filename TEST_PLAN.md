# Test Plan

## LSP (Rust)
- **Completion**: verify stdlib and local symbol suggestions for in-memory documents.
- **Hover**: verify doc-comment hover shows the documentation.
- **Definition**: verify go-to-definition finds local symbols and workspace symbols.
- **References**: verify references include all word-boundary matches.
- **Document Symbols**: verify symbol list contains functions and structs.
- **Workspace Symbols**: verify query filters symbol list across files.

Implemented in `packages/lsp/tests/lsp_tests.rs` using `tokio::test` with mock documents and temporary workspaces.

## VS Code Extension
- **Activation**: open a `.kor` document and ensure the extension activates.
- **Completion integration**: trigger completion and assert it includes stdlib items like `print`.

Implemented in `packages/vscode-extension/src/test/suite/index.ts` using `@vscode/test-electron`.

## Electron IDE (Playwright E2E)
- **Launch**: start the Electron app and verify the welcome screen renders.

Implemented in `packages/electron-ide/tests/e2e.spec.ts` using Playwright's Electron launcher.

## Manual Smoke Tests
- Open a `.kor` file and confirm:
  - Diagnostics appear after edits
  - Hover shows documentation
  - Completion suggests stdlib symbols
- Use the terminal to run `korlang build` and `korlang run`.
- Open the KPM panel and verify the registry loads.
