import { ApiStatus } from '../types';

// アプリケーションの状態型定義
export interface AppState {
  // API関連
  apiStatus: ApiStatus;
  
  // 文字起こし設定
  useTemperature: boolean;
  temperature: number;
  useVadFilter: boolean;
  prompt: string;
  hotwords: string[];
  
  // サーバー設定
  serverConfig: {
    apiUrl: string;
    apiToken: string;
    useAuth: boolean;
    useServerProxy: boolean;
  };
  
  // FFmpeg初期化状態
  ffmpegPreInitStatus: {
    isInitializing: boolean;
    isInitialized: boolean;
    initError: string | null;
  };
}

// 初期状態を生成する関数
export const createInitialAppState = (): AppState => {
  const getStoredValue = (key: string, defaultValue: string | boolean) => {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    if (typeof defaultValue === 'boolean') return stored === 'true';
    return stored;
  };

  return {
    // API関連
    apiStatus: { status: 'unknown', message: '', details: '' },
    
    // 文字起こし設定
    useTemperature: false,
    temperature: 0.7,
    useVadFilter: getStoredValue('useVadFilter', false) as boolean,
    prompt: '',
    hotwords: [],
    
    // サーバー設定
    serverConfig: {
      apiUrl: getStoredValue('apiUrl', import.meta.env.VITE_WHISPER_API_URL || 'http://localhost:9000') as string,
      apiToken: getStoredValue('apiToken', import.meta.env.VITE_WHISPER_API_TOKEN || '') as string,
      useAuth: getStoredValue('useAuth', !!import.meta.env.VITE_WHISPER_API_TOKEN) as boolean,
      useServerProxy: getStoredValue('useServerProxy', import.meta.env.VITE_USE_SERVER_PROXY === 'true') as boolean,
    },
    
    // FFmpeg初期化状態
    ffmpegPreInitStatus: {
      isInitializing: false,
      isInitialized: false,
      initError: null,
    }
  };
};

// セレクター関数（型安全性とパフォーマンス向上）
export const selectApiStatus = (state: AppState) => state.apiStatus;
export const selectUseTemperature = (state: AppState) => state.useTemperature;
export const selectTemperature = (state: AppState) => state.temperature;
export const selectUseVadFilter = (state: AppState) => state.useVadFilter;
export const selectPrompt = (state: AppState) => state.prompt;
export const selectHotwords = (state: AppState) => state.hotwords;
export const selectServerConfig = (state: AppState) => state.serverConfig;
export const selectFFmpegPreInitStatus = (state: AppState) => state.ffmpegPreInitStatus;

// 複合セレクター用の型定義
export interface TranscriptionOptions {
  model: string;
  language?: string;
  responseFormat: 'vtt';
  timestampGranularity: string;
  temperature?: number;
  prompt?: string;
  hotwords?: string[];
  task: 'transcribe';
  useVadFilter: boolean;
}

export interface ApiConfig {
  baseUrl: string;
  token?: string;
  useServerProxy: boolean;
}

// 複合セレクター（メモ化版）
let _apiConfigCache: ApiConfig | null = null;
let _apiConfigCacheKey: string | null = null;

export const selectApiConfig = (state: AppState): ApiConfig => {
  const { serverConfig } = state;
  const cacheKey = `${serverConfig.useServerProxy}-${serverConfig.apiUrl}-${serverConfig.useAuth}-${serverConfig.apiToken}`;
  
  if (_apiConfigCacheKey === cacheKey && _apiConfigCache) {
    return _apiConfigCache;
  }
  
  const result: ApiConfig = {
    baseUrl: serverConfig.useServerProxy ? '/whisper' : serverConfig.apiUrl,
    token: serverConfig.useAuth ? serverConfig.apiToken : undefined,
    useServerProxy: serverConfig.useServerProxy
  };
  
  _apiConfigCache = result;
  _apiConfigCacheKey = cacheKey;
  return result;
};
