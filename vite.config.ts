import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// グローバル型の拡張
declare global {
  interface Window {
    __vite_proxy_config?: {
      target: string;
      changeOrigin: boolean;
      secure: boolean;
      ws: boolean;
    };
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 環境変数を読み込む
  const env = loadEnv(mode, process.cwd(), '');
  const useServerProxy = env.VITE_USE_SERVER_PROXY === 'true';
  const proxyTarget = useServerProxy ? env.VITE_SERVER_PROXY_URL : undefined;

  return {
    plugins: [react()],
    root: '.',
    publicDir: 'public',
    build: {
      outDir: 'dist',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    server: {
      port: 3000,
      ...(useServerProxy && proxyTarget && {
        proxy: {
          '/whisper': {
            target: proxyTarget,
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/whisper/, '')
          },
        },
      })
    },
  };
}); 