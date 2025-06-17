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
      reporter: ['text'],
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
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    // 並行実行の設定
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      }
    },
    testTimeout: 15000,
    hookTimeout: 15000,
    // より多くの並行実行を可能にする
    maxConcurrency: 8,
    // テスト実行の詳細設定
    logHeapUsage: true,
    reporters: ['default'],
    typecheck: {
      enabled: false,
    },
    // Unhandled rejectionを適切にキャッチ
    dangerouslyIgnoreUnhandledErrors: false,
    // より安全なテスト実行
    isolate: true,
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
      '@services': resolve(__dirname, '../services'),
      '@app': resolve(__dirname, '../app'),
      '@sections': resolve(__dirname, '../sections')
    }
  }
});