import { ipcRenderer, shell } from 'electron';

const api = {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  saveFile: (path: string, content: string) => ipcRenderer.invoke('file:save', path, content),
  build: (cwd: string) => ipcRenderer.invoke('korlang:build', cwd),
  run: (cwd: string) => ipcRenderer.invoke('korlang:run', cwd),
  kpmInstall: (cwd: string, pkg: string) => ipcRenderer.invoke('korlang:kpm', cwd, pkg),
  installKorlang: () => shell.openExternal('https://project-korlang.github.io/'),
  openExternal: (url: string) => shell.openExternal(url)
};

(window as any).korlang = api;
