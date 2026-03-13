import React from 'react';
import { useStore } from '../store';

export function DiagnosticsPanel() {
  const { diagnostics } = useStore();
  return (
    <div className="diagnostics">
      <h3>Diagnostics</h3>
      <ul>
        {diagnostics.map((d, i) => (
          <li key={i} className={d.severity}>
            {d.path}:{d.line + 1} {d.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
