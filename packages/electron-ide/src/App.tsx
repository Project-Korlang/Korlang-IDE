import React from 'react';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { Terminal } from './components/Terminal';
import { StatusBar } from './components/StatusBar';
import { KpmPanel } from './components/KpmPanel';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { WelcomeScreen } from './components/WelcomeScreen';
import { useStore } from './store';
import './style.css';

export default function App() {
  const { workspacePath, openFiles, openFile, setWorkspace } = useStore();

  React.useEffect(() => {
    const offOpenFile = window.korlang?.onMenuOpenFile?.(async () => {
      const result = await window.korlang?.openFile?.();
      if (result) openFile(result.path, result.content);
    });

    const offOpenFolder = window.korlang?.onMenuOpenFolder?.(async () => {
      const folder = await window.korlang?.openFolder?.();
      if (folder) setWorkspace(folder);
    });

    return () => {
      if (offOpenFile) offOpenFile();
      if (offOpenFolder) offOpenFolder();
    };
  }, [openFile, setWorkspace]);

  return (
    <div className="app">
      <div className="layout">
        <Sidebar />
        <div className="main">
          {!workspacePath && <WelcomeScreen />}
          {workspacePath && (
            <>
              <Editor />
              <div className="panels">
                <DiagnosticsPanel />
                <KpmPanel />
              </div>
              <Terminal />
            </>
          )}
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
