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

export function App() {
  const { workspacePath, openFiles } = useStore();

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
