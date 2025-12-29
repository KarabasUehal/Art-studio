import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic'  // ← Добавь это, чтобы Vite использовал классический режим (как в CRA), с import React
    })
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@styles': path.resolve(__dirname, 'src/components/styles'),
      '@pages': path.resolve(__dirname, 'src/components/pages'),
      '@components': path.resolve(__dirname, 'src/components'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.css'],  // ← Оставь для автоматических импортов без расширений
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  publicDir: 'public',  // ← Если у тебя статические файлы (favicon, manifest) — оставь; иначе удали

  css: {
    preprocessorOptions: {
      css: {
        charset: false,
      },
    },
  },
});