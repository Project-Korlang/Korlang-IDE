import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { createMenu } from './menu';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let lspProcess: ReturnType<typeof spawn> | null = null;

const isDev = !!process.env.VITE_DEV_SERVER_URL;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: true
    }
  });

  createMenu(mainWindow);

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL as string);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
  }
}

function startLsp() {
  if (lspProcess) return;
  lspProcess = spawn('korlang-lsp', ['--tcp', '127.0.0.1:9257'], { stdio: 'pipe' });
  lspProcess.on('exit', () => {
    lspProcess = null;
  });

  ipcMain.handle('lsp:stdio', () => {
    if (!lspProcess) return null;
    return {
      pid: lspProcess.pid
    };
  });
}

app.whenReady().then(() => {
  createWindow();
  startLsp();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] });
  if (result.canceled || result.filePaths.length === 0) return null;
  const path = result.filePaths[0];
  const content = fs.readFileSync(path, 'utf-8');
  return { path, content };
});

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('file:save', async (_evt, path: string, content: string) => {
  fs.writeFileSync(path, content, 'utf-8');
  return true;
});

ipcMain.handle('korlang:build', async (_evt, cwd: string) => {
  const child = spawn('korlang', ['build'], { cwd, stdio: 'pipe' });
  return new Promise((resolve) => {
    let out = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (out += d.toString()));
    child.on('close', () => resolve(out));
  });
});

ipcMain.handle('korlang:run', async (_evt, cwd: string) => {
  const child = spawn('korlang', ['run'], { cwd, stdio: 'pipe' });
  return new Promise((resolve) => {
    let out = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (out += d.toString()));
    child.on('close', () => resolve(out));
  });
});

ipcMain.handle('korlang:kpm', async (_evt, cwd: string, pkg: string) => {
  const child = spawn('korlang', ['kpm', 'install', pkg], { cwd, stdio: 'pipe' });
  return new Promise((resolve) => {
    let out = '';
    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (out += d.toString()));
    child.on('close', () => resolve(out));
  });
});
