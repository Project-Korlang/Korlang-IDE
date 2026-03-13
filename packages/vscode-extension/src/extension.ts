import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node';
import { registerCommands } from './commands';
import { KorlangStatusBar } from './statusBar';
import { registerKpmPanel } from './kpmPanel';

let client: LanguageClient | undefined;

function createServerOptions(): ServerOptions {
  const config = vscode.workspace.getConfiguration('korlang');
  const lspPath = config.get<string>('lspPath', 'korlang-lsp');
  return {
    command: lspPath,
    args: ['--stdio'],
    options: { env: process.env }
  };
}

function createClient(context: vscode.ExtensionContext): LanguageClient {
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: 'korlang', scheme: 'file' }],
    initializationOptions: {
      compilerPath: vscode.workspace.getConfiguration('korlang').get('compilerPath', 'korlang')
    }
  };

  return new LanguageClient('korlang-lsp', 'Korlang Language Server', createServerOptions(), clientOptions);
}

async function startClient(context: vscode.ExtensionContext) {
  if (client) {
    return;
  }
  client = createClient(context);
  client.onDidChangeState((e) => {
    if (e.newState === 3) {
      // Stopped
      client = undefined;
      setTimeout(() => startClient(context), 1000);
    }
  });
  await client.start();
}

export async function activate(context: vscode.ExtensionContext) {
  await startClient(context);

  const statusBar = new KorlangStatusBar();
  context.subscriptions.push(statusBar);

  registerCommands(context, () => client);
  registerKpmPanel(context);

  const config = vscode.workspace.getConfiguration('korlang');
  if (config.get<boolean>('formatOnSave', true)) {
    context.subscriptions.push(
      vscode.workspace.onWillSaveTextDocument((e) => {
        if (e.document.languageId === 'korlang') {
          vscode.commands.executeCommand('korlang.format');
        }
      })
    );
  }
}

export async function deactivate() {
  if (client) {
    await client.stop();
    client = undefined;
  }
}
