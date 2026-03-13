import React from 'react';
import { useStore } from '../store';

export function StatusBar() {
  const { workspacePath } = useStore();
  return (
    <div className="statusbar">
      <span>Korlang IDE</span>
      <span>{workspacePath ? workspacePath : 'No workspace'}</span>
    </div>
  );
}
