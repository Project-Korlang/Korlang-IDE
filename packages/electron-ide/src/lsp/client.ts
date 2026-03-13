import net from 'net';
import {
  createMessageConnection,
  MessageConnection,
  StreamMessageReader,
  StreamMessageWriter
} from 'vscode-jsonrpc/node';
import {
  CompletionItem,
  CompletionParams,
  Diagnostic,
  DidChangeTextDocumentParams,
  DidOpenTextDocumentParams,
  Hover,
  InitializeParams,
  Position,
  PublishDiagnosticsParams,
  TextDocumentItem
} from 'vscode-languageserver-protocol';

export type DiagnosticsHandler = (uri: string, diagnostics: Diagnostic[]) => void;

export class KorlangLspClient {
  private connection?: MessageConnection;
  private diagnosticsHandler?: DiagnosticsHandler;
  private seq = 1;

  async connect(rootUri: string) {
    const socket = net.connect(9257, '127.0.0.1');
    const reader = new StreamMessageReader(socket);
    const writer = new StreamMessageWriter(socket);
    this.connection = createMessageConnection(reader, writer);

    this.connection.onNotification('textDocument/publishDiagnostics', (params: PublishDiagnosticsParams) => {
      if (this.diagnosticsHandler) {
        this.diagnosticsHandler(params.uri, params.diagnostics);
      }
    });

    this.connection.listen();

    const init: InitializeParams = {
      processId: process.pid,
      rootUri,
      capabilities: {}
    };
    await this.connection.sendRequest('initialize', init);
    this.connection.sendNotification('initialized', {});
  }

  onDiagnostics(handler: DiagnosticsHandler) {
    this.diagnosticsHandler = handler;
  }

  openDocument(uri: string, languageId: string, text: string, version: number) {
    if (!this.connection) return;
    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri,
        languageId,
        version,
        text
      } as TextDocumentItem
    };
    this.connection.sendNotification('textDocument/didOpen', params);
  }

  changeDocument(uri: string, text: string, version: number) {
    if (!this.connection) return;
    const params: DidChangeTextDocumentParams = {
      textDocument: { uri, version },
      contentChanges: [{ text }]
    };
    this.connection.sendNotification('textDocument/didChange', params);
  }

  async completion(uri: string, position: Position): Promise<CompletionItem[]> {
    if (!this.connection) return [];
    const params: CompletionParams = {
      textDocument: { uri },
      position
    };
    const result = await this.connection.sendRequest('textDocument/completion', params);
    if (Array.isArray(result)) return result as CompletionItem[];
    if (result && (result as any).items) return (result as any).items as CompletionItem[];
    return [];
  }

  async hover(uri: string, position: Position): Promise<Hover | null> {
    if (!this.connection) return null;
    const result = await this.connection.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position
    });
    return (result as Hover) || null;
  }

  async shutdown() {
    if (!this.connection) return;
    await this.connection.sendRequest('shutdown', {});
    this.connection.sendNotification('exit');
    this.connection.dispose();
  }
}
