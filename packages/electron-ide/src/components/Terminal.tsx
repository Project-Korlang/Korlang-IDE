import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import 'node-pty';
import * as pty from 'node-pty';
import { useStore } from '../store';

export function Terminal() {
  const ref = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<XTerm | null>(null);
  const ptyRef = useRef<pty.IPty | null>(null);
  const { workspacePath } = useStore();

  useEffect(() => {
    if (!ref.current) return;
    const term = new XTerm({
      theme: {
        background: '#0f1115',
        foreground: '#e6e6e6'
      },
      fontFamily: 'monospace',
      fontSize: 12
    });
    term.open(ref.current);
    termRef.current = term;

    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cwd: workspacePath || process.cwd(),
      env: process.env as any
    });
    ptyRef.current = ptyProcess;

    ptyProcess.onData((data) => term.write(data));
    term.onData((data) => ptyProcess.write(data));

    return () => {
      ptyProcess.kill();
      term.dispose();
    };
  }, [workspacePath]);

  return <div className="terminal" ref={ref} />;
}
