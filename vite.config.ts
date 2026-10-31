import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// GitHub Pages 项目站点部署在 /<repo>/ 下，构建时用 base 指定资源前缀；本地 dev 保持 '/'。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/csgogo/' : '/',
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
} as any));
