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
  whisperApiUrl: string | undefined;
  whisperApiToken: string | undefined;
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

/**
 * config.jsの読み込みを待機する関数
 * @param timeout タイムアウト時間（ミリ秒）
 * @returns config.jsが読み込まれたかどうか
 */
export const waitForConfig = (timeout: number = 2000): Promise<boolean> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkConfig = () => {
      // config.jsが読み込まれているかチェック
      if ((window as any).APP_CONFIG) {
        resolve(true);
        return;
      }
      
      // タイムアウトチェック
      if (Date.now() - startTime >= timeout) {
        // 開発環境では警告を出さない
        if (import.meta.env.MODE !== 'development') {
          console.warn('config.js loading timed out, falling back to environment variables');
        }
        resolve(false);
        return;
      }
      
      // 200ms後に再チェック（頻度を下げる）
      setTimeout(checkConfig, 200);
    };
    
    checkConfig();
  });
};

/**
 * 非同期で設定を初期化する関数
 */
export const initializeConfigAsync = async (): Promise<ConfigState> => {
  // config.jsの読み込みを待機（短縮されたタイムアウト）
  const configLoaded = await waitForConfig(2000);
  
  if (!configLoaded && import.meta.env.MODE !== 'development') {
    console.warn('config.js could not be loaded within timeout, using environment variables');
  }
  
  // 同期的な初期化関数を呼び出し
  return createInitialConfigState();
};

/**
 * config.jsからの設定を取得する関数
 */
export const getRuntimeConfig = () => {
  return (window as any).APP_CONFIG;
};

// 初期状態を生成する関数
export const createInitialConfigState = (): ConfigState => {
  // 環境変数からのデフォルト設定
  const defaultConfig = {
    whisperApiUrl: import.meta.env.VITE_WHISPER_API_URL || undefined,
    whisperApiToken: import.meta.env.VITE_WHISPER_API_TOKEN || undefined,
    useServerProxy: import.meta.env.VITE_USE_SERVER_PROXY === 'true',
    serverProxyUrl: import.meta.env.VITE_SERVER_PROXY_URL || undefined,
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
  const runtimeConfig = getRuntimeConfig();
  
  // config.jsが存在し、かつ値が設定されている場合は優先的に使用
  if (runtimeConfig && Object.keys(runtimeConfig).length > 0) {
    console.log('Using config.js settings:', runtimeConfig);
    
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
      // config.jsからの値を優先的に使用
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
  // 開発環境または本番環境でconfig.jsが存在しない/空の場合は環境変数を使用
  else {
    console.log('Using environment variables as config.js is not available or empty');
    
    // .envファイルまたは環境変数の値をデフォルトとして使用
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
  }

  // ローカルストレージの設定を読み込む（ユーザー設定のみ）
  const localStorageConfig = loadFromLocalStorage();

  // マージした設定（基本設定を保持し、ユーザー設定のみ上書き）
  const mergedConfig = {
    ...(baseConfig as ConfigState),
    // ローカルストレージからはユーザーが変更可能な設定のみを適用
    ...(localStorageConfig && localStorageConfig.useServerProxy !== undefined 
      ? { useServerProxy: localStorageConfig.useServerProxy }
      : {}),
    // 認証情報は編集可能な場合のみローカルストレージから復元
    ...(localStorageConfig && baseConfig.allowCredentialEdit && localStorageConfig.whisperApiUrl 
      ? { whisperApiUrl: localStorageConfig.whisperApiUrl }
      : {}),
    ...(localStorageConfig && baseConfig.allowCredentialEdit && localStorageConfig.whisperApiToken !== undefined
      ? { whisperApiToken: localStorageConfig.whisperApiToken }
      : {})
  };

  // 制約の適用
  // allowCredentialEditが無効な場合のみプロキシを強制
  if (!mergedConfig.allowCredentialEdit) {
    // 認証情報編集不可の場合はプロキシを強制（認証情報は上書きしない）
    mergedConfig.useServerProxy = true;
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
  if (!mergedConfig.whisperApiUrl && mergedConfig.allowCredentialEdit) {
    error.hasError = true;
    error.errorType = 'config-load-error';
    error.message = 'Invalid configuration: WHISPER_API_URL is required but not provided';
  } else if (!isDevelopment && !runtimeConfig) {
    error.hasError = true;
    error.errorType = 'no-config';
    error.message = 'Configuration file (config.js) is not found. Please ensure the config.js file is properly deployed and accessible.';
  }

  return {
    ...mergedConfig,
    loading: false, // バックグラウンド読み込みのため初期状態はfalse
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
