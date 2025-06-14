import { AppConfig } from '../hooks/useConfig';

// エラー状態の型定義
export interface ConfigError {
  hasError: boolean;
  errorType: 'no-config' | 'config-load-error' | null;
  message: string;
}

// 設定状態の型定義
export interface ConfigState extends AppConfig {
  // 設定
  whisperApiUrl: string;
  whisperApiToken: string;
  useServerProxy: boolean;
  serverProxyUrl: string;
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
 * allowCredentialEdit=falseの場合のみプロキシが強制的に有効
 * hideCredentials=trueでもallowCredentialEdit=trueの場合はプロキシ切り替え可能
 */
export const isProxyLocked = (state: ConfigState): boolean => {
  return !state.allowCredentialEdit;
};

/**
 * 制約に基づいて実際のプロキシ状態を取得する関数
 * プロキシロックが優先、次にforceProxyDisabledが適用される
 */
export const getEffectiveProxyState = (state: ConfigState): boolean => {
  // allowCredentialEdit=falseの場合は強制的にtrue
  if (isProxyLocked(state)) {
    return true;
  }
  
  // forceProxyDisabledがtrueで、かつロック条件がない場合はfalse
  if (state.forceProxyDisabled) {
    return false;
  }
  
  // それ以外は現在のuseServerProxy値を返す
  return state.useServerProxy;
};

// 初期状態を生成する関数
export const createInitialConfigState = (): ConfigState => {
  // 環境変数からのデフォルト設定
  const defaultConfig = {
    whisperApiUrl: import.meta.env.VITE_WHISPER_API_URL || 'http://localhost:9000',
    whisperApiToken: import.meta.env.VITE_WHISPER_API_TOKEN || '',
    useServerProxy: import.meta.env.VITE_USE_SERVER_PROXY === 'true',
    serverProxyUrl: import.meta.env.VITE_SERVER_PROXY_URL || 'http://localhost:9000',
    appTitle: import.meta.env.VITE_APP_TITLE || 'Whisper WebUI',
    healthCheckUrl: import.meta.env.VITE_HEALTH_CHECK_URL || '',
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
    hideCredentials: import.meta.env.VITE_HIDE_CREDENTIALS === 'true',
    allowCredentialEdit: import.meta.env.VITE_ALLOW_CREDENTIAL_EDIT !== 'false'
  };

  // 重要: サーバープロキシが強制的に無効化されているかどうか
  const forceProxyDisabled = import.meta.env.VITE_USE_SERVER_PROXY === 'false';

  // 環境に応じたデフォルト設定を取得
  let baseConfig: Partial<ConfigState>;
  
  const isDevelopment = import.meta.env.MODE === 'development';
  
  if (isDevelopment) {
    // 開発環境では .env の値をデフォルトとして使用
    const hideCredentials = defaultConfig.hideCredentials;
    const allowCredentialEdit = defaultConfig.allowCredentialEdit;
    
    // 制約に基づいて実際のプロキシ状態を決定
    let useServerProxy = defaultConfig.useServerProxy;
    
    // allowCredentialEdit=falseの場合のみ強制的にuseServerProxy=true
    if (!allowCredentialEdit) {
      useServerProxy = true;
    }
    // forceProxyDisabled=trueかつ上記の制約がない場合はuseServerProxy=false
    else if (forceProxyDisabled) {
      useServerProxy = false;
    }
    
    baseConfig = {
      ...defaultConfig,
      useServerProxy,
      allowCredentialEdit,
      hideCredentials
    };
  } else {
    // 本番環境では config.js をデフォルトとして使用
    const runtimeConfig = (window as any).APP_CONFIG;
    
    if (!runtimeConfig) {
      baseConfig = {
        ...defaultConfig,
      };
    } else {
      // 認証情報の表示制限設定を取得
      const hideCredentials = runtimeConfig.HIDE_CREDENTIALS === 'true' || defaultConfig.hideCredentials;
      const allowCredentialEdit = runtimeConfig.ALLOW_CREDENTIAL_EDIT !== 'false' && defaultConfig.allowCredentialEdit;
      
      // 制約に基づいて実際のプロキシ状態を決定
      let useServerProxy = runtimeConfig.USE_SERVER_PROXY === 'true' || defaultConfig.useServerProxy;
      
      // allowCredentialEdit=falseの場合のみ強制的にuseServerProxy=true
      if (!allowCredentialEdit) {
        useServerProxy = true;
      }
      // forceProxyDisabled=trueかつ上記の制約がない場合はuseServerProxy=false
      else if (forceProxyDisabled) {
        useServerProxy = false;
      }
      
      baseConfig = {
        // APIのURLとトークンのデフォルト値を使用（hideCredentialsでもデフォルト値は保持）
        whisperApiUrl: runtimeConfig.WHISPER_API_URL || defaultConfig.whisperApiUrl,
        whisperApiToken: runtimeConfig.WHISPER_API_TOKEN || defaultConfig.whisperApiToken,
        useServerProxy,
        serverProxyUrl: runtimeConfig.SERVER_PROXY_URL || defaultConfig.serverProxyUrl,
        appTitle: runtimeConfig.APP_TITLE || defaultConfig.appTitle,
        healthCheckUrl: runtimeConfig.HEALTH_CHECK_URL || defaultConfig.healthCheckUrl,
        environment: runtimeConfig.ENVIRONMENT || defaultConfig.environment,
        hideCredentials,
        allowCredentialEdit
      };
    }
  }

  // ローカルストレージの設定を読み込む
  const localStorageConfig = loadFromLocalStorage();

  // マージした設定（ローカルストレージが優先）
  const mergedConfig = {
    ...(baseConfig as ConfigState),
    ...(localStorageConfig || {})
  };

  // 制約の適用
  // allowCredentialEditが無効な場合のみ強制制約を適用
  if (!mergedConfig.allowCredentialEdit) {
    // 認証情報編集不可の場合はプロキシを強制し、認証情報を隠す
    mergedConfig.useServerProxy = true;
    mergedConfig.whisperApiUrl = 'http://localhost:9000';
    mergedConfig.whisperApiToken = '';
  }
  // forceProxyDisabledがtrueの場合は、allowCredentialEditの制約がなければプロキシを無効化
  else if (forceProxyDisabled) {
    mergedConfig.useServerProxy = false;
  }

  // エラー状態の初期化
  const error: ConfigError = {
    hasError: false,
    errorType: null,
    message: ''
  };

  // 必須設定の検証
  if (!mergedConfig.whisperApiUrl && !mergedConfig.allowCredentialEdit) {
    error.hasError = true;
    error.errorType = 'config-load-error';
    error.message = 'Invalid configuration: WHISPER_API_URL is required but not provided';
  } else if (!isDevelopment && !(window as any).APP_CONFIG) {
    error.hasError = true;
    error.errorType = 'no-config';
    error.message = 'Configuration file (config.js) is not found. Please ensure the config.js file is properly deployed and accessible.';
  }

  return {
    ...mergedConfig,
    loading: false,
    error,
    forceProxyDisabled
  } as ConfigState;
};

// セレクター関数
export const selectWhisperApiUrl = (state: ConfigState) => state.whisperApiUrl;
export const selectWhisperApiToken = (state: ConfigState) => state.whisperApiToken;
export const selectUseServerProxy = (state: ConfigState) => getEffectiveProxyState(state);
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
  state.allowCredentialEdit && !getEffectiveProxyState(state);

export const selectConfig = (state: ConfigState) => ({
  whisperApiUrl: state.whisperApiUrl,
  whisperApiToken: state.whisperApiToken,
  useServerProxy: getEffectiveProxyState(state),
  serverProxyUrl: state.serverProxyUrl,
  appTitle: state.appTitle,
  healthCheckUrl: state.healthCheckUrl,
  environment: state.environment,
  hideCredentials: state.hideCredentials,
  allowCredentialEdit: state.allowCredentialEdit
});
