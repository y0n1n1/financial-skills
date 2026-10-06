import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The site is served from https://y0n1n1.github.io/financial-skills/, so assets
 * need that prefix in production. Dev stays at the root.
 */
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/financial-skills/' : '/',
  plugins: [react()],
  resolve: {
    alias: { '@tfg/core': new URL('../packages/core-ts/src/index.ts', import.meta.url).pathname },
  },
  build: { outDir: 'dist', sourcemap: false },
}));
