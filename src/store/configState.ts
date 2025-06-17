import { AppConfig } from '../hooks/useConfig';

// エラー状態の型定義
export interface ConfigError {
  hasError: boolean;
  errorType: 'no-config' | 'config-load-error' | null;
  message: string;
}

// 設定状態の型定義
export interface ConfigState extends AppConfig {
  // ダイレクトモード設定
  whisperApiUrl: string | undefined;
  whisperApiToken: string | undefined;
  
  // プロキシモード設定
  whisperProxyApiUrl: string | undefined;
  whisperProxyApiToken: string | undefined;
  
  // 共通設定
  useServerProxy: boolean;
  serverProxyUrl: string | undefined;
  appTitle: string;
  healthCheckUrl: string;
  environment: string;
  hideCredentials: boolean;
  allowCredentialEdit: boolean;
  
  // メタ情報
  loading: boolean;
  error: ConfigError;
  forceProxyDisabled: boolean;
}

// ローカルストレージのキー
export const LOCAL_STORAGE_KEY = 'whisper-webui-config';

// ローカルストレージからの設定読み込み
export const loadFromLocalStorage = (): Partial<ConfigState> | null => {
  try {
    const savedConfig = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedConfig) {
      return JSON.parse(savedConfig);
    }
    return null;
  } catch (error) {
    console.warn('Failed to load config from localStorage:', error);
    return null;
  }
};

// ローカルストレージへの設定保存
export const saveToLocalStorage = (config: Partial<ConfigState>): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to save config to localStorage:', error);
  }
};

/**
 * プロキシ強制モードかどうかを判定する関数
 * hideCredentials=trueまたはallowCredentialEdit=falseの場合にプロキシが強制的に有効
 */
export const isProxyLocked = (state: ConfigState): boolean => {
  return state.hideCredentials || !state.allowCredentialEdit;
};

/**
 * 制約に基づいて実際のプロキシ状態を取得する関数
 * プロキシロックが優先、次にforceProxyDisabledが適用される
 */
export const getEffectiveProxyState = (state: ConfigState): boolean => {
  if (isProxyLocked(state)) {
    return true;
  }
  
  if (state.forceProxyDisabled) {
    return false;
  }
  
  return state.useServerProxy;
};

/**
 * config.jsからの設定を取得する関数
 */
export const getRuntimeConfig = () => {
  return (window as any).APP_CONFIG;
};

/**
 * config.jsの読み込みを待機する関数
 */
export const waitForConfig = (timeout: number = 2000): Promise<boolean> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkConfig = () => {
      if ((window as any).APP_CONFIG) {
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime >= timeout) {
        if (import.meta.env.MODE !== 'development') {
          console.warn('config.js loading timed out, falling back to environment variables');
        }
        resolve(false);
        return;
      }
      
      setTimeout(checkConfig, 200);
    };
    
    checkConfig();
  });
};

/**
 * 非同期で設定を初期化する関数
 */
export const initializeConfigAsync = async (): Promise<ConfigState> => {
  const configLoaded = await waitForConfig(2000);
  
  if (!configLoaded && import.meta.env.MODE !== 'development') {
    console.warn('config.js could not be loaded within timeout, using environment variables');
  }
  
  return createInitialConfigState();
};

/**
 * 設定値を取得する関数（優先順位: config.js > 環境変数 > デフォルト）
 */
export const getConfigValue = (envKey: string, configKey: string, defaultValue?: string): string | undefined => {
  const runtimeConfig = getRuntimeConfig();
  
  // 優先順位: 1. config.js, 2. 環境変数, 3. デフォルト値
  if (runtimeConfig && runtimeConfig[configKey] !== undefined) {
    return runtimeConfig[configKey];
  }
  
  const envValue = import.meta.env[envKey];
  if (envValue !== undefined) {
    return envValue;
  }
  
  return defaultValue;
};

/**
 * プロキシモード時の設定値を取得する関数
 */
export const getProxyModeValues = () => {
  // プロキシURL: プロキシ専用URL > 一般プロキシURL > デフォルト
  const proxyUrl = getConfigValue('VITE_SERVER_PROXY_URL', 'SERVER_PROXY_URL') || '/api/transcribe';
  
  // プロキシトークン: プロキシ専用トークン > 一般APIトークン
  const proxyToken = getConfigValue('VITE_WHISPER_PROXY_TOKEN', 'WHISPER_PROXY_TOKEN') || 
                     getConfigValue('VITE_WHISPER_API_TOKEN', 'WHISPER_API_TOKEN') || '';
  
  return {
    apiUrl: proxyUrl,
    apiToken: proxyToken
  };
};

/**
 * ダイレクトモード時の設定値を取得する関数
 */
export const getDirectModeValues = () => {
  // ダイレクトAPI URL とトークン
  const apiUrl = getConfigValue('VITE_WHISPER_API_URL', 'WHISPER_API_URL') || 'http://localhost:9000';
  const apiToken = getConfigValue('VITE_WHISPER_API_TOKEN', 'WHISPER_API_TOKEN') || '';
  
  return {
    apiUrl,
    apiToken
  };
};

// 初期状態を生成する関数
export const createInitialConfigState = (): ConfigState => {
  const isDevelopment = import.meta.env.MODE === 'development';
  
  // 基本設定を環境変数/config.jsから取得
  const hideCredentials = getConfigValue('VITE_HIDE_CREDENTIALS', 'HIDE_CREDENTIALS') === 'true';
  const allowCredentialEdit = getConfigValue('VITE_ALLOW_CREDENTIAL_EDIT', 'ALLOW_CREDENTIAL_EDIT') !== 'false';
  const forceProxyDisabled = getConfigValue('VITE_USE_SERVER_PROXY', 'USE_SERVER_PROXY') === 'false';
  
  // 初期設定値（環境変数/config.jsから取得）
  const initialDirectApiUrl = getConfigValue('VITE_WHISPER_API_URL', 'WHISPER_API_URL') || 'http://localhost:9000';
  const initialDirectApiToken = getConfigValue('VITE_WHISPER_API_TOKEN', 'WHISPER_API_TOKEN') || '';
  const initialProxyApiUrl = getConfigValue('VITE_SERVER_PROXY_URL', 'SERVER_PROXY_URL') || '/api/transcribe';
  const initialProxyApiToken = getConfigValue('VITE_WHISPER_PROXY_TOKEN', 'WHISPER_PROXY_TOKEN') || 
                               getConfigValue('VITE_WHISPER_API_TOKEN', 'WHISPER_API_TOKEN') || '';
  const initialUseProxy = getConfigValue('VITE_USE_SERVER_PROXY', 'USE_SERVER_PROXY') === 'true';
  
  // ローカルストレージから保存された設定を読み込み
  const localStorageConfig = loadFromLocalStorage();
  
  // 実際の設定値を決定（優先順位: ユーザー設定 > 環境/config.js > デフォルト）
  let whisperApiUrl = localStorageConfig?.whisperApiUrl ?? initialDirectApiUrl;
  let whisperApiToken = localStorageConfig?.whisperApiToken ?? initialDirectApiToken;
  let whisperProxyApiUrl = localStorageConfig?.whisperProxyApiUrl ?? initialProxyApiUrl;
  let whisperProxyApiToken = localStorageConfig?.whisperProxyApiToken ?? initialProxyApiToken;
  let useServerProxy = localStorageConfig?.useServerProxy ?? initialUseProxy;
  
  // 制約の適用
  if (isProxyLocked({ hideCredentials, allowCredentialEdit } as ConfigState)) {
    useServerProxy = true;
  } else if (forceProxyDisabled) {
    useServerProxy = false;
  }
  
  // エラー状態の初期化
  const error: ConfigError = {
    hasError: false,
    errorType: null,
    message: ''
  };
  
  // 必須設定の検証
  const runtimeConfig = getRuntimeConfig();
  if (!whisperApiUrl && allowCredentialEdit && !getEffectiveProxyState({ useServerProxy, hideCredentials, allowCredentialEdit } as ConfigState)) {
    error.hasError = true;
    error.errorType = 'config-load-error';
    error.message = 'Invalid configuration: WHISPER_API_URL is required for direct mode but not provided';
  } else if (!isDevelopment && !runtimeConfig) {
    error.hasError = true;
    error.errorType = 'no-config';
    error.message = 'Configuration file (config.js) is not found. Please ensure the config.js file is properly deployed and accessible.';
  }
  
  return {
    whisperApiUrl,
    whisperApiToken,
    whisperProxyApiUrl,
    whisperProxyApiToken,
    useServerProxy,
    serverProxyUrl: initialProxyApiUrl, // 下位互換性のため残す
    appTitle: getConfigValue('VITE_APP_TITLE', 'APP_TITLE') || 'Whisper WebUI',
    healthCheckUrl: getConfigValue('VITE_HEALTH_CHECK_URL', 'HEALTH_CHECK_URL') || '',
    environment: getConfigValue('VITE_ENVIRONMENT', 'ENVIRONMENT') || 'development',
    hideCredentials,
    allowCredentialEdit,
    loading: false,
    error,
    forceProxyDisabled
  } as ConfigState;
};

// シンプルなセレクター関数
export const selectWhisperApiUrl = (state: ConfigState) => state.whisperApiUrl;
export const selectWhisperApiToken = (state: ConfigState) => state.whisperApiToken;
export const selectWhisperProxyApiUrl = (state: ConfigState) => state.whisperProxyApiUrl;
export const selectWhisperProxyApiToken = (state: ConfigState) => state.whisperProxyApiToken;
export const selectUseServerProxy = (state: ConfigState) => getEffectiveProxyState(state);
export const selectRawUseServerProxy = (state: ConfigState) => state.useServerProxy; // 制約を適用しない生の値
export const selectServerProxyUrl = (state: ConfigState) => state.serverProxyUrl;
export const selectAppTitle = (state: ConfigState) => state.appTitle;
export const selectHealthCheckUrl = (state: ConfigState) => state.healthCheckUrl;
export const selectEnvironment = (state: ConfigState) => state.environment;
export const selectHideCredentials = (state: ConfigState) => state.hideCredentials;
export const selectAllowCredentialEdit = (state: ConfigState) => state.allowCredentialEdit;
export const selectLoading = (state: ConfigState) => state.loading;
export const selectError = (state: ConfigState) => state.error;
export const selectForceProxyDisabled = (state: ConfigState) => state.forceProxyDisabled;

// 複合セレクター
export const selectCanEditCredentials = (state: ConfigState) => 
  state.allowCredentialEdit && !state.hideCredentials;

/**
 * 現在のモードに基づいてアクティブなAPI URLとトークンを取得
 */
export const selectActiveApiUrl = (state: ConfigState): string => {
  const useProxy = getEffectiveProxyState(state);
  
  if (useProxy) {
    return state.whisperProxyApiUrl || state.serverProxyUrl || '/api/transcribe';
  }
  return state.whisperApiUrl || 'http://localhost:9000';
};

export const selectActiveApiToken = (state: ConfigState): string => {
  const useProxy = getEffectiveProxyState(state);
  
  if (useProxy) {
    return state.whisperProxyApiToken || '';
  }
  return state.whisperApiToken || '';
};

export const selectConfig = (state: ConfigState) => {
  return {
    whisperApiUrl: selectActiveApiUrl(state),
    whisperApiToken: selectActiveApiToken(state),
    useServerProxy: getEffectiveProxyState(state),
    serverProxyUrl: state.serverProxyUrl,
    appTitle: state.appTitle,
    healthCheckUrl: state.healthCheckUrl,
    environment: state.environment,
    hideCredentials: state.hideCredentials,
    allowCredentialEdit: state.allowCredentialEdit
  };
};