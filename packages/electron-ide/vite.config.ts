import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      external: [
        'fs',
        'path',
        'net',
        'os',
        'tty',
        'events',
        'child_process',
        'worker_threads',
        'node-pty'
      ]
    }
  },
  optimizeDeps: {
    exclude: ['node-pty']
  }
});
