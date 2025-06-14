import { useConfig as useConfigStore, initializeConfig } from '../store/useConfigStore';
import { useEffect, useRef } from 'react';

export interface AppConfig {
  whisperApiUrl: string | undefined;
  whisperApiToken: string | undefined;
  useServerProxy: boolean;
  serverProxyUrl: string | undefined;
  appTitle: string;
  healthCheckUrl: string;
  environment: string;
  hideCredentials: boolean;
  allowCredentialEdit: boolean;
}

// グローバルな初期化状態管理
let isInitializationStarted = false;

/**
 * 設定フック - 元のAPIとの互換性を維持するためのラッパー
 * 内部ではStore実装を使用
 */
export function useConfig() {
  const isFirstRun = useRef(true);

  // 初回使用時に一度だけ初期化（複数のコンポーネントで使われても1回のみ）
  useEffect(() => {
    if (isFirstRun.current && !isInitializationStarted) {
      isInitializationStarted = true;
      initializeConfig();
    }
    isFirstRun.current = false;
  }, []);

  // Store実装を直接使用（設定の統一）
  return useConfigStore();
}