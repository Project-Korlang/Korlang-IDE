import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EditorView, keymap, hoverTooltip, ViewUpdate } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap } from '@codemirror/commands';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';
import { lintGutter, linter, Diagnostic as CmdDiagnostic } from '@codemirror/lint';
import { oneDark } from '@codemirror/theme-one-dark';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { vim } from '@codemirror/vim';
import { useStore } from '../store';
import { KorlangLspClient } from '../lsp/client';

const lspClient = new KorlangLspClient();

export function Editor() {
  const { openFiles, activeFile, updateFile, setActiveFile, workspacePath, diagnostics, setDiagnostics } = useStore();
  const [vimMode, setVimMode] = useState(false);
  const [split, setSplit] = useState(false);
  const [splitVertical, setSplitVertical] = useState(true);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);

  const active = openFiles.find((f) => f.path === activeFile) || openFiles[0];

  useEffect(() => {
    if (!workspacePath) return;
    lspClient.connect(`file://${workspacePath}`).then(() => {
      lspClient.onDiagnostics((uri, diags) => {
        const mapped = diags.map((d) => ({
          path: uri.replace('file://', ''),
          line: d.range.start.line,
          message: d.message,
          severity: (d.severity === 1 ? 'error' : d.severity === 2 ? 'warning' : d.severity === 3 ? 'info' : 'hint') as any
        }));
        setDiagnostics(mapped);
      });
    });
  }, [workspacePath, setDiagnostics]);

  const diagnosticsForActive = useMemo(() => {
    if (!active) return [] as CmdDiagnostic[];
    return diagnostics
      .filter((d) => d.path === active.path)
      .map((d) => ({
        from: 0,
        to: 1,
        severity: d.severity,
        message: d.message
      }));
  }, [diagnostics, active]);

  useEffect(() => {
    if (!editorRef.current || !active) return;

    const state = EditorState.create({
      doc: active.content,
      extensions: [
        keymap.of(defaultKeymap),
        oneDark,
        bracketMatching(),
        indentOnInput(),
        lintGutter(),
        linter(() => diagnosticsForActive),
        autocompletion({ override: [async (context: CompletionContext) => {
          if (!active) return null;
          const pos = context.pos;
          const line = context.state.doc.lineAt(pos);
          const from = line.from;
          const to = line.to;
          const list = await lspClient.completion(`file://${active.path}`, {
            line: line.number - 1,
            character: pos - from
          });
          return { from, to, options: list.map((i) => ({ label: i.label, type: 'variable' })) };
        }] }),
        hoverTooltip(async (view, pos) => {
          if (!active) return null;
          const line = view.state.doc.lineAt(pos);
          const hover = await lspClient.hover(`file://${active.path}`, {
            line: line.number - 1,
            character: pos - line.from
          });
          if (!hover) return null;
          const contents = Array.isArray(hover.contents) ? hover.contents.map((c) => (typeof c === 'string' ? c : c.value)).join('\n') : (hover.contents as any).value;
          return {
            pos,
            end: pos + 1,
            above: true,
            create() {
              const dom = document.createElement('div');
              dom.textContent = contents;
              dom.style.whiteSpace = 'pre-wrap';
              dom.style.padding = '6px 8px';
              dom.style.background = '#11151c';
              dom.style.border = '1px solid #2a2f3a';
              return { dom };
            }
          };
        }),
        EditorView.updateListener.of((v: ViewUpdate) => {
          if (v.docChanged && active) {
            const content = v.state.doc.toString();
            updateFile(active.path, content);
            lspClient.changeDocument(`file://${active.path}`, content, Date.now());
          }
        }),
        vimMode ? vim() : []
      ]
    });

    if (viewRef.current) {
      viewRef.current.destroy();
    }

    viewRef.current = new EditorView({ state, parent: editorRef.current });

    lspClient.openDocument(`file://${active.path}`, 'korlang', active.content, 1);

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [active, diagnosticsForActive, updateFile, vimMode]);

  if (!active) {
    return <div className="editor-empty">Open a file to start coding.</div>;
  }

  return (
    <div className={`editor ${split ? (splitVertical ? 'split-vertical' : 'split-horizontal') : ''}`}>
      <div className="editor-toolbar">
        <div className="tabs">
          {openFiles.map((f) => (
            <button key={f.path} className={f.path === active.path ? 'active' : ''} onClick={() => setActiveFile(f.path)}>
              {f.path.split(/[/\\]/).pop()}
            </button>
          ))}
        </div>
        <div className="actions">
          <button onClick={() => setVimMode((v) => !v)}>{vimMode ? 'Vim On' : 'Vim Off'}</button>
          <button onClick={() => setSplit((s) => !s)}>{split ? 'Single' : 'Split'}</button>
          <button onClick={() => setSplitVertical((v) => !v)}>{splitVertical ? 'Vertical' : 'Horizontal'}</button>
        </div>
      </div>
      <div className="editor-pane" ref={editorRef}></div>
      {split && <div className="editor-pane" />}
    </div>
  );
}
