import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useStore } from '../store';

type Release = {
  name: string;
  html_url: string;
};

export function WelcomeScreen() {
  const { setWorkspace } = useStore();
  const [hasCompiler, setHasCompiler] = useState<boolean | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('korlang.recent');
      if (stored) setRecent(JSON.parse(stored));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        await (window as any).require('child_process').execSync('korlang --version');
        setHasCompiler(true);
      } catch {
        setHasCompiler(false);
      }
    };
    check();
  }, []);

  useEffect(() => {
    axios.get('https://api.github.com/orgs/project-korlang/releases').then((res) => {
      setReleases(res.data.slice(0, 5).map((r: any) => ({ name: r.name, html_url: r.html_url })));
    }).catch(() => setReleases([]));
  }, []);

  const openFolder = async () => {
    const folder = await (window as any).korlang?.openFolder?.();
    if (folder) {
      setWorkspace(folder);
      const updated = [folder, ...recent.filter((r) => r !== folder)].slice(0, 5);
      localStorage.setItem('korlang.recent', JSON.stringify(updated));
      setRecent(updated);
    }
  };

  const openExample = async () => {
    (window as any).korlang?.openExternal?.('https://github.com/project-korlang/korlang-compiler/tree/main/examples');
  };

  return (
    <div className="welcome">
      <h1>Welcome to Korlang IDE</h1>
      <p>Fast, native tooling for the Korlang language.</p>

      <div className="welcome-section">
        <h2>Compiler</h2>
        {hasCompiler === null && <p>Detecting compiler...</p>}
        {hasCompiler === false && (
          <div>
            <p>Korlang compiler not found in PATH.</p>
            <button onClick={() => (window as any).korlang?.installKorlang?.()}>Install Korlang</button>
          </div>
        )}
        {hasCompiler === true && <p>Korlang compiler detected.</p>}
      </div>

      <div className="welcome-section">
        <h2>Quick Actions</h2>
        <button onClick={() => (window as any).korlang?.openFolder?.()}>Open Folder</button>
        <button onClick={openFolder}>Open Folder (Set Workspace)</button>
        <button onClick={openExample}>Open Example</button>
      </div>

      <div className="welcome-section">
        <h2>Recent Projects</h2>
        <ul>
          {recent.map((r) => (
            <li key={r}>
              <button onClick={() => setWorkspace(r)}>{r}</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="welcome-section">
        <h2>News</h2>
        <ul>
          {releases.map((r) => (
            <li key={r.name}>
              <button onClick={() => (window as any).korlang?.openExternal?.(r.html_url)}>{r.name}</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="welcome-links">
        <button onClick={() => (window as any).korlang?.openExternal?.('https://project-korlang.github.io/korlang-site')}>Docs</button>
        <button onClick={() => (window as any).korlang?.openExternal?.('https://discord.gg/')}>Discord</button>
        <button onClick={() => (window as any).korlang?.openExternal?.('https://github.com/project-korlang')}>GitHub</button>
      </div>
    </div>
  );
}
