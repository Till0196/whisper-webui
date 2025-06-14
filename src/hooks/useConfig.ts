import { useConfig as useConfigStore } from '../store/useConfigStore';

export interface AppConfig {
  whisperApiUrl: string;
  whisperApiToken: string;
  useServerProxy: boolean;
  serverProxyUrl: string;
  appTitle: string;
  healthCheckUrl: string;
  environment: string;
  hideCredentials: boolean;
  allowCredentialEdit: boolean;
}

/**
 * 設定フック - 元のAPIとの互換性を維持するためのラッパー
 * 内部ではStore実装を使用
 */
export const useConfig = () => {
  return useConfigStore();
};