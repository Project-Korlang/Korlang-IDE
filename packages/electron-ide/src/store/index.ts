import { create } from 'zustand';

export type OpenFile = {
  path: string;
  content: string;
};

export type Diagnostic = {
  path: string;
  line: number;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
};

type State = {
  workspacePath: string | null;
  openFiles: OpenFile[];
  activeFile: string | null;
  diagnostics: Diagnostic[];
  setWorkspace: (path: string) => void;
  openFile: (path: string, content: string) => void;
  updateFile: (path: string, content: string) => void;
  setActiveFile: (path: string) => void;
  setDiagnostics: (diags: Diagnostic[]) => void;
};

export const useStore = create<State>((set) => ({
  workspacePath: null,
  openFiles: [],
  activeFile: null,
  diagnostics: [],
  setWorkspace: (path) => set({ workspacePath: path }),
  openFile: (path, content) => set((state) => {
    const existing = state.openFiles.find((f) => f.path === path);
    const openFiles = existing ? state.openFiles : [...state.openFiles, { path, content }];
    return { openFiles, activeFile: path };
  }),
  updateFile: (path, content) => set((state) => ({
    openFiles: state.openFiles.map((f) => (f.path === path ? { ...f, content } : f))
  })),
  setActiveFile: (path) => set({ activeFile: path }),
  setDiagnostics: (diags) => set({ diagnostics: diags })
}));
