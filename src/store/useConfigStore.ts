import { StateStore, useStateSelector, useStateUpdater } from '../hooks/useStateManager';
import { ConfigState, createInitialConfigState, initializeConfigAsync, selectWhisperApiUrl, selectWhisperApiToken, selectWhisperProxyApiUrl, selectWhisperProxyApiToken, selectActiveApiUrl, selectActiveApiToken, selectUseServerProxy, selectRawUseServerProxy, selectServerProxyUrl, selectAppTitle, selectHealthCheckUrl, selectEnvironment, selectHideCredentials, selectAllowCredentialEdit, selectLoading, selectError, selectForceProxyDisabled, selectCanEditCredentials, selectConfig, saveToLocalStorage, getEffectiveProxyState, isProxyLocked, LOCAL_STORAGE_KEY, getRuntimeConfig, getConfigValue, getProxyModeValues, getDirectModeValues } from './configState';
import { useCallback } from 'react';

// グローバルストア（シングルトン）
const globalConfigStore = new StateStore(createInitialConfigState());

// 初期化状態を管理
let isConfigInitialized = false;
let isConfigInitializing = false;
let initializationPromise: Promise<void> | null = null;

/**
 * 設定の非同期初期化を実行
 */
export const initializeConfig = async (): Promise<void> => {
  if (isConfigInitialized) {
    return;
  }
  
  if (isConfigInitializing && initializationPromise) {
    return initializationPromise;
  }
  
  isConfigInitializing = true;
  
  initializationPromise = (async () => {
    try {
      console.log('Starting config initialization...');
      
      const initializedConfig = await initializeConfigAsync();
      
      globalConfigStore.setState(prevState => ({
        ...initializedConfig,
        loading: false
      }));
      
      console.log('Config initialization completed');
      isConfigInitialized = true;
    } catch (error) {
      console.error('Failed to initialize config:', error);
      
      globalConfigStore.setState(prevState => ({
        ...prevState,
        loading: false,
        error: {
          hasError: true,
          errorType: 'config-load-error',
          message: `Configuration initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }));
    } finally {
      isConfigInitializing = false;
      initializationPromise = null;
    }
  })();
  
  return initializationPromise;
};

/**
 * 設定状態を取得するhook（状態変更通知なし）
 */
export function useConfigStore() {
  return globalConfigStore;
}

/**
 * 設定全体を購読するhook
 */
export function useConfigData() {
  const store = useConfigStore();
  const stableSelector = useCallback(selectConfig, []);
  return useStateSelector(store, stableSelector);
}

/**
 * Whisper API URL（ダイレクト）を購読するhook
 */
export function useWhisperApiUrl() {
  const store = useConfigStore();
  const stableSelector = useCallback(selectWhisperApiUrl, []);
  return useStateSelector(store, stableSelector);
}

/**
 * Whisper API Token（ダイレクト）を購読するhook
 */
export function useWhisperApiToken() {
  const store = useConfigStore();
  const stableSelector = useCallback(selectWhisperApiToken, []);
  return useStateSelector(store, stableSelector);
}

/**
 * Whisper Proxy API URLを購読するhook
 */
export function useWhisperProxyApiUrl() {
  const store = useConfigStore();
  const stableSelector = useCallback(selectWhisperProxyApiUrl, []);
  return useStateSelector(store, stableSelector);
}

/**
 * Whisper Proxy API Tokenを購読するhook
 */
export function useWhisperProxyApiToken() {
  const store = useConfigStore();
  const stableSelector = useCallback(selectWhisperProxyApiToken, []);
  return useStateSelector(store, stableSelector);
}

/**
 * アクティブなAPI URL（現在のモードに応じた）を購読するhook
 */
export function useActiveApiUrl() {
  const store = useConfigStore();
  const stableSelector = useCallback(selectActiveApiUrl, []);
  return useStateSelector(store, stableSelector);
}

/**
 * アクティブなAPI Token（現在のモードに応じた）を購読するhook
 */
export function useActiveApiToken() {
  const store = useConfigStore();
  const stableSelector = useCallback(selectActiveApiToken, []);
  return useStateSelector(store, stableSelector);
}

/**
 * サーバープロキシ設定を購読するhook
 */
export function useServerProxy() {
  const store = useConfigStore();
  const stableSelectorUse = useCallback(selectUseServerProxy, []);
  const stableSelectorUrl = useCallback(selectServerProxyUrl, []);
  const useServerProxy = useStateSelector(store, stableSelectorUse);
  const serverProxyUrl = useStateSelector(store, stableSelectorUrl);
  return { useServerProxy, serverProxyUrl };
}

/**
 * 生のサーバープロキシ設定を購読するhook（制約適用なし）
 */
export function useRawServerProxy() {
  const store = useConfigStore();
  const stableSelector = useCallback(selectRawUseServerProxy, []);
  const rawUseServerProxy = useStateSelector(store, stableSelector);
  return rawUseServerProxy;
}

/**
 * アプリタイトルを購読するhook
 */
export function useAppTitle() {
  const store = useConfigStore();
  const stableSelector = useCallback(selectAppTitle, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 認証情報の保護設定を購読するhook
 */
export function useCredentialSettings() {
  const store = useConfigStore();
  const stableSelectorHide = useCallback(selectHideCredentials, []);
  const stableSelectorAllow = useCallback(selectAllowCredentialEdit, []);
  const stableSelectorCanEdit = useCallback(selectCanEditCredentials, []);
  
  const hideCredentials = useStateSelector(store, stableSelectorHide);
  const allowCredentialEdit = useStateSelector(store, stableSelectorAllow);
  const canEditCredentials = useStateSelector(store, stableSelectorCanEdit);
  
  return { hideCredentials, allowCredentialEdit, canEditCredentials };
}

/**
 * 設定のロード状態を購読するhook
 */
export function useConfigLoading() {
  const store = useConfigStore();
  const stableSelector = useCallback(selectLoading, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 設定のエラー状態を購読するhook
 */
export function useConfigError() {
  const store = useConfigStore();
  const stableSelector = useCallback(selectError, []);
  return useStateSelector(store, stableSelector);
}

/**
 * プロキシの強制無効化状態を購読するhook
 */
export function useForceProxyDisabled() {
  const store = useConfigStore();
  const stableSelector = useCallback(selectForceProxyDisabled, []);
  return useStateSelector(store, stableSelector);
}

/**
 * プロキシのロック状態を購読するhook
 */
export function useProxyLocked() {
  const store = useConfigStore();
  const selector = useCallback((state: ConfigState) => isProxyLocked(state), []);
  return useStateSelector(store, selector);
}

/**
 * 設定更新用hook - 分離されたエンドポイント/トークンフィールドに対応
 */
export function useConfigUpdater() {
  const store = useConfigStore();
  const updateState = useStateUpdater(store);
  
  const updateConfig = useCallback((newConfig: Partial<ConfigState>) => {
    const currentState = store.getState();
    
    console.log('updateConfig called with:', newConfig);
    
    // 制約に基づく自動調整
    const updatedConfig = { ...newConfig };
    
    // 制約チェック
    const hideCredentials = updatedConfig.hideCredentials ?? currentState.hideCredentials;
    const allowCredentialEdit = updatedConfig.allowCredentialEdit ?? currentState.allowCredentialEdit;
    
    // プロキシ設定の制約適用
    if (updatedConfig.useServerProxy !== undefined) {
      if (hideCredentials || !allowCredentialEdit) {
        updatedConfig.useServerProxy = true;
        console.log('Force proxy due to credential restrictions');
      } else if (currentState.forceProxyDisabled && updatedConfig.useServerProxy === true) {
        console.warn('User trying to enable proxy but it is force disabled');
      }
    }

    // ローカルストレージに保存（hideCredentialsの場合は認証情報を除外）
    const storageConfig: Partial<ConfigState> = {};
    if (updatedConfig.useServerProxy !== undefined) {
      storageConfig.useServerProxy = updatedConfig.useServerProxy;
    }
    
    // ダイレクトモードの設定
    if (updatedConfig.whisperApiUrl !== undefined && !hideCredentials) {
      storageConfig.whisperApiUrl = updatedConfig.whisperApiUrl;
    }
    if (updatedConfig.whisperApiToken !== undefined && !hideCredentials) {
      storageConfig.whisperApiToken = updatedConfig.whisperApiToken;
    }
    
    // プロキシモードの設定
    if (updatedConfig.whisperProxyApiUrl !== undefined && !hideCredentials) {
      storageConfig.whisperProxyApiUrl = updatedConfig.whisperProxyApiUrl;
    }
    if (updatedConfig.whisperProxyApiToken !== undefined && !hideCredentials) {
      storageConfig.whisperProxyApiToken = updatedConfig.whisperProxyApiToken;
    }
    
    saveToLocalStorage(storageConfig);
    
    console.log('Applying config update:', updatedConfig);
    
    // 状態を更新
    updateState(updatedConfig);
  }, [updateState, store]);

  return updateConfig;
}

/**
 * 環境/config.jsからのデフォルト値を取得する関数（モード別）
 */
const getDefaultValuesFromEnvironment = () => {
  // プロキシモードのデフォルト設定を取得
  const proxyValues = getProxyModeValues();
  const directValues = getDirectModeValues();
  const useServerProxy = getConfigValue('VITE_USE_SERVER_PROXY', 'USE_SERVER_PROXY') === 'true';
  
  return {
    proxy: proxyValues,
    direct: directValues,
    useServerProxy
  };
};

/**
 * 設定をリセットするhook（環境/config.jsデフォルトに復元）
 */
export function useConfigReset() {
  const store = useConfigStore();
  const updateState = useStateUpdater(store);
  
  const resetConfig = useCallback(() => {
    // ローカルストレージをクリア
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear config from localStorage:', error);
    }
    
    // 環境/config.jsのデフォルト値を取得
    const defaultValues = getDefaultValuesFromEnvironment();
    
    console.log('Resetting config to defaults:', defaultValues);
    
    // デフォルト値で更新（両方のモードの値を設定）
    updateState({
      whisperApiUrl: defaultValues.direct.apiUrl,
      whisperApiToken: defaultValues.direct.apiToken,
      whisperProxyApiUrl: defaultValues.proxy.apiUrl,
      whisperProxyApiToken: defaultValues.proxy.apiToken,
      useServerProxy: defaultValues.useServerProxy
    });
  }, [updateState, store]);

  return { resetConfig };
}

/**
 * 元のuseConfig互換性のためのラッパー
 */
export function useConfig() {
  const config = useConfigData();
  const loading = useConfigLoading();
  const error = useConfigError();
  const { canEditCredentials } = useCredentialSettings();
  const forceProxyDisabled = useForceProxyDisabled();
  const proxyLocked = useProxyLocked();
  const updateConfig = useConfigUpdater();
  const { resetConfig } = useConfigReset();

  return { 
    config,
    loading, 
    error, 
    forceProxyDisabled,
    proxyLocked,
    canEditCredentials,
    updateConfig,
    resetConfig
  };
}