import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

export function registerCommands(context: vscode.ExtensionContext, getClient: () => LanguageClient | undefined) {
  const terminal = () => vscode.window.createTerminal('Korlang');

  context.subscriptions.push(vscode.commands.registerCommand('korlang.build', async () => {
    const term = terminal();
    term.show();
    term.sendText('korlang build');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('korlang.run', async () => {
    const term = terminal();
    term.show();
    term.sendText('korlang run');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('korlang.new', async () => {
    const name = await vscode.window.showInputBox({ prompt: 'New Korlang project name' });
    if (!name) return;
    const term = terminal();
    term.show();
    term.sendText(`korlang new ${name}`);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('korlang.install', async () => {
    const name = await vscode.window.showInputBox({ prompt: 'KPM package to install' });
    if (!name) return;
    const term = terminal();
    term.show();
    term.sendText(`korlang kpm install ${name}`);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('korlang.format', async () => {
    const client = getClient();
    if (client) {
      await vscode.commands.executeCommand('editor.action.formatDocument');
    }
  }));
}
