import { StateStore, useStateSelector, useStateUpdater } from '../hooks/useStateManager';
import { ConfigState, createInitialConfigState, selectWhisperApiUrl, selectWhisperApiToken, selectUseServerProxy, selectServerProxyUrl, selectAppTitle, selectHealthCheckUrl, selectEnvironment, selectHideCredentials, selectAllowCredentialEdit, selectLoading, selectError, selectForceProxyDisabled, selectCanEditCredentials, selectConfig, saveToLocalStorage, getEffectiveProxyState, isProxyLocked } from './configState';
import { useCallback } from 'react';

// グローバルストア（シングルトン）
const globalConfigStore = new StateStore(createInitialConfigState());

/**
 * 設定状態を作成するhook（Appコンポーネントでのみ使用）
 */
export function useCreateConfigState() {
  return globalConfigStore;
}

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
 * Whisper API URLを購読するhook
 */
export function useWhisperApiUrl() {
  const store = useConfigStore();
  const stableSelector = useCallback(selectWhisperApiUrl, []);
  return useStateSelector(store, stableSelector);
}

/**
 * Whisper API Tokenを購読するhook
 */
export function useWhisperApiToken() {
  const store = useConfigStore();
  const stableSelector = useCallback(selectWhisperApiToken, []);
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
 * 設定更新用hook
 */
export function useConfigUpdater() {
  const store = useConfigStore();
  const updateState = useStateUpdater(store);
  
  const updateConfig = useCallback((newConfig: Partial<ConfigState>) => {
    const currentState = store.getState();
    
    // 制約の適用と更新
    const updatedConfig = { ...newConfig };
    
    // 設定値の制約を適用
    if (updatedConfig.hideCredentials || (newConfig.hideCredentials === undefined && currentState.hideCredentials)) {
      // 認証情報保護モードでは必ずプロキシを使用し、認証情報編集を不可に
      updatedConfig.useServerProxy = true;
      updatedConfig.allowCredentialEdit = false;
    } else if (!updatedConfig.allowCredentialEdit || 
              (newConfig.allowCredentialEdit === undefined && !currentState.allowCredentialEdit)) {
      // 認証情報編集不可の場合もプロキシを強制
      updatedConfig.useServerProxy = true;
    }
    
    // forceProxyDisabledはhideCredentialsやallowCredentialEditよりも優先度が低い
    const hideCredentials = updatedConfig.hideCredentials !== undefined 
      ? updatedConfig.hideCredentials 
      : currentState.hideCredentials;
      
    const allowCredentialEdit = updatedConfig.allowCredentialEdit !== undefined
      ? updatedConfig.allowCredentialEdit
      : currentState.allowCredentialEdit;
    
    // 制約に基づいて最終的なプロキシ状態を決定
    if (!hideCredentials && allowCredentialEdit && currentState.forceProxyDisabled) {
      updatedConfig.useServerProxy = false;
    }

    // ローカルストレージに保存する値（機密情報は省略可能）
    const configToSave: Partial<ConfigState> = {
      useServerProxy: updatedConfig.useServerProxy !== undefined ? updatedConfig.useServerProxy : currentState.useServerProxy,
      serverProxyUrl: updatedConfig.serverProxyUrl || currentState.serverProxyUrl,
      // 認証情報は必要な場合のみ保存
      ...((updatedConfig.allowCredentialEdit !== undefined ? updatedConfig.allowCredentialEdit : currentState.allowCredentialEdit) 
        ? { 
            whisperApiUrl: updatedConfig.whisperApiUrl || currentState.whisperApiUrl, 
            whisperApiToken: updatedConfig.whisperApiToken || currentState.whisperApiToken
          } 
        : {})
    };

    // 設定をローカルストレージに保存
    saveToLocalStorage(configToSave);
    
    // 状態を更新
    updateState(updatedConfig);
  }, [updateState]);

  return updateConfig;
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

  return { 
    config,
    loading, 
    error, 
    forceProxyDisabled,
    proxyLocked,
    canEditCredentials,
    updateConfig
  };
}
