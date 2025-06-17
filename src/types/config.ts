// 設定関連の型定義

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

export interface ConfigError {
  hasError: boolean;
  errorType: 'no-config' | 'config-load-error' | null;
  message: string;
}

// テーマ関連
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeState {
  mode: ThemeMode;
  systemPrefersDark: boolean;
}

// 言語関連
export type Language = 'ja' | 'en';

export type LanguageNames = {
  [key in Language]: {
    [key: string]: string;
  };
};

// アプリケーション状態の型定義
export interface AppState {
  // API関連
  apiStatus: {
    status: 'unknown' | 'healthy' | 'error';
    message: string;
    details: string;
  };
  
  // 文字起こし設定
  useTemperature: boolean;
  temperature: number;
  useVadFilter: boolean;
  prompt: string;
  hotwords: string[];
  
  // FFmpeg初期化状態
  ffmpegPreInitStatus: {
    isInitializing: boolean;
    isInitialized: boolean;
    initError: string | null;
  };
}
