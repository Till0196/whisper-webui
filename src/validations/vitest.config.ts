/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, './setup.ts')],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000',
        pretendToBeVisual: true,
        resources: 'usable'
      }
    },
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/validations/',
        '**/*.d.ts',
        'src/index.tsx',
        'src/reportWebVitals.ts',
        '**/*.config.*',
        'coverage/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../'),
      '@validations': resolve(__dirname, './'),
      '@components': resolve(__dirname, '../components'),
      '@hooks': resolve(__dirname, '../hooks'),
      '@store': resolve(__dirname, '../store'),
      '@types': resolve(__dirname, '../types'),
      '@lib': resolve(__dirname, '../lib'),
      '@i18n': resolve(__dirname, '../i18n'),
      '@services': resolve(__dirname, '../services')
    }
  }
});
