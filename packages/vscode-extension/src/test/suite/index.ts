import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

suite('Korlang Extension', () => {
  test('Completion provides stdlib symbols', async () => {
    const doc = await vscode.workspace.openTextDocument({ language: 'korlang', content: 'fn main() { pri }' });
    await vscode.window.showTextDocument(doc);

    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const suggestions = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', doc.uri, new vscode.Position(0, 15));

    const labels = suggestions?.items.map((i) => i.label.toString()) || [];
    assert.ok(labels.includes('print') || labels.includes('println'));
  });
});
