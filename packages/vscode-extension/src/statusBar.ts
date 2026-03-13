import * as vscode from 'vscode';
import { exec } from 'child_process';

export class KorlangStatusBar implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private timer?: NodeJS.Timeout;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.text = 'Korlang: checking...';
    this.item.show();
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 30000);
  }

  private refresh() {
    exec('korlang --version', (err, stdout) => {
      if (err) {
        this.item.text = 'Korlang: not found';
        return;
      }
      this.item.text = `Korlang: ${stdout.trim()}`;
    });
  }

  dispose() {
    this.item.dispose();
    if (this.timer) clearInterval(this.timer);
  }
}
