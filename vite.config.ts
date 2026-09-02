import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';

const projectRoot = dirname(fileURLToPath(import.meta.url));

const commitSha =
  process.env.COMMIT_SHA?.trim() ||
  process.env.GIT_COMMIT_SHA?.trim() ||
  process.env.GITHUB_SHA?.trim() ||
  process.env.VITE_COMMIT_SHA?.trim() ||
  process.env.SOURCE_VERSION?.trim() ||
  process.env.K_REVISION?.trim() ||
  'local-dev';

const appVersion = process.env.npm_package_version || '0.3.0';
const buildTime = new Date().toISOString();

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(projectRoot, '.'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
    __APP_BUILD_INFO__: JSON.stringify({
      version: appVersion,
      commitSha,
      buildTime,
      environment: mode,
    }),
  },
  server: {
    port: Number(process.env.PORT) || 3000,
    host: '0.0.0.0',
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
  preview: {
    port: Number(process.env.PORT) || 3000,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    emptyOutDir: true,
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';
            if (id.includes('motion')) return 'vendor-motion';
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) return 'vendor-pdf';
          }
        },
      },
    },
  },
}));
