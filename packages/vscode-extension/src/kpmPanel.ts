import * as vscode from 'vscode';

const KPM_URL = 'https://project-korlang.github.io/KPM/';

export function registerKpmPanel(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('korlang.kpmBrowser', () => {
    const panel = vscode.window.createWebviewPanel('korlangKpm', 'Korlang KPM', vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true
    });

    panel.webview.html = getWebviewHtml();

    panel.webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'install' && typeof msg.name === 'string') {
        const term = vscode.window.createTerminal('Korlang KPM');
        term.show();
        term.sendText(`korlang kpm install ${msg.name}`);
      }
    });
  }));
}

function getWebviewHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${KPM_URL}; script-src 'unsafe-inline'; style-src 'unsafe-inline';" />
  <style>
    html, body, iframe { margin:0; padding:0; width:100%; height:100%; }
    body { background:#0f1115; }
  </style>
</head>
<body>
  <iframe id="kpm" src="${KPM_URL}"></iframe>
  <script>
    const vscode = acquireVsCodeApi();
    const frame = document.getElementById('kpm');
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'kpm-install' && event.data.name) {
        vscode.postMessage({ type: 'install', name: event.data.name });
      }
    });
    frame.addEventListener('load', () => {
      frame.contentWindow.postMessage({ type: 'vscode-host' }, '*');
    });
  </script>
</body>
</html>`;
}
