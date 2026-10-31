import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
  resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: false,
    watch: { ignored: ['**/.preview/**', '**/.tmp/**', '**/.tools/**', '**/.npm-cache/**', '**/dist/**', '**/.*.tmpdir/**'] },
  },
  test: {
    environment: 'node',
    pool: 'threads',
    include: ['src/tests/**/*.test.ts', 'src/tests/**/*.test.tsx'],
    testTimeout: 120000,
  },
} as any);
