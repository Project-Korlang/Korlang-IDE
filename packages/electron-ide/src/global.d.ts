export {};

declare global {
  interface Window {
    korlang?: {
      openFile?: () => Promise<{ path: string; content: string } | null>;
      openFolder?: () => Promise<string | null>;
      saveFile?: (path: string, content: string) => Promise<boolean>;
      build?: (cwd: string) => Promise<string>;
      run?: (cwd: string) => Promise<string>;
      kpmInstall?: (cwd: string, pkg: string) => Promise<string>;
      installKorlang?: () => void;
      openExternal?: (url: string) => void;
      onMenuOpenFile?: (handler: () => void) => () => void;
      onMenuOpenFolder?: (handler: () => void) => () => void;
    };
  }
}
