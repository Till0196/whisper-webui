import { StateStore, useStateSelector, useStateUpdater } from '../hooks/useStateManager';
import { AppState, createInitialAppState, selectApiStatus, selectUseTemperature, selectTemperature, selectUseVadFilter, selectPrompt, selectHotwords, selectServerConfig, selectFFmpegPreInitStatus, selectApiConfig } from './appState';
import { useCallback } from 'react';

// グローバルストア（シングルトン）
const globalAppStore = new StateStore(createInitialAppState());

/**
 * アプリケーション状態を作成するhook（Appコンポーネントでのみ使用）
 * このhookを使ったコンポーネントは状態変更通知を受け取らない
 */
export function useCreateAppState() {
  return globalAppStore;
}

/**
 * アプリケーション状態を取得するhook（状態変更通知なし）
 */
export function useAppStore() {
  return globalAppStore;
}

/**
 * API状態を購読するhook
 */
export function useApiStatus() {
  const store = useAppStore();
  const stableSelector = useCallback(selectApiStatus, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 温度設定を購読するhook
 */
export function useTemperatureSettings() {
  const store = useAppStore();
  const stableUseTemperatureSelector = useCallback(selectUseTemperature, []);
  const stableTemperatureSelector = useCallback(selectTemperature, []);
  const useTemperature = useStateSelector(store, stableUseTemperatureSelector);
  const temperature = useStateSelector(store, stableTemperatureSelector);
  return { useTemperature, temperature };
}

/**
 * VADフィルター設定を購読するhook
 */
export function useVadFilter() {
  const store = useAppStore();
  const stableSelector = useCallback(selectUseVadFilter, []);
  return useStateSelector(store, stableSelector);
}

/**
 * プロンプト設定を購読するhook
 */
export function usePrompt() {
  const store = useAppStore();
  const stableSelector = useCallback(selectPrompt, []);
  return useStateSelector(store, stableSelector);
}

/**
 * ホットワード設定を購読するhook
 */
export function useHotwords() {
  const store = useAppStore();
  const stableSelector = useCallback(selectHotwords, []);
  return useStateSelector(store, stableSelector);
}

/**
 * サーバー設定を購読するhook
 */
export function useServerConfig() {
  const store = useAppStore();
  const stableSelector = useCallback(selectServerConfig, []);
  return useStateSelector(store, stableSelector);
}

/**
 * FFmpeg初期化状態を購読するhook
 */
export function useFFmpegPreInitStatus() {
  const store = useAppStore();
  const stableSelector = useCallback(selectFFmpegPreInitStatus, []);
  return useStateSelector(store, stableSelector);
}

/**
 * API設定を購読するhook（複合セレクター）
 */
export function useApiConfig() {
  const store = useAppStore();
  const stableSelector = useCallback(selectApiConfig, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 状態更新用のディスパッチャーを取得するhook
 * このhookを使ったコンポーネントは状態変更通知を受け取らない
 */
export function useAppStateDispatcher() {
  const store = useAppStore();
  return useCallback(() => useStateUpdater(store), [store])();
}

/**
 * 特定の状態のみを更新するためのヘルパーhook群
 */
export function useApiStatusUpdater() {
  const dispatcher = useAppStateDispatcher();
  return (apiStatus: AppState['apiStatus']) => {
    dispatcher({ apiStatus });
  };
}

export function useTemperatureSettingsUpdater() {
  const dispatcher = useAppStateDispatcher();
  return {
    setUseTemperature: (useTemperature: boolean) => {
      dispatcher({ useTemperature });
    },
    setTemperature: (temperature: number) => {
      dispatcher({ temperature });
    }
  };
}

export function useVadFilterUpdater() {
  const dispatcher = useAppStateDispatcher();
  return (useVadFilter: boolean) => {
    dispatcher({ useVadFilter });
    localStorage.setItem('useVadFilter', useVadFilter.toString());
  };
}

export function usePromptUpdater() {
  const dispatcher = useAppStateDispatcher();
  return (prompt: string) => {
    dispatcher({ prompt });
  };
}

export function useHotwordsUpdater() {
  const dispatcher = useAppStateDispatcher();
  return (hotwords: string[]) => {
    dispatcher({ hotwords });
  };
}

export function useServerConfigUpdater() {
  const dispatcher = useAppStateDispatcher();
  return (serverConfig: AppState['serverConfig']) => {
    // 制約に基づいて最終的な設定を決定
    // これにより、useServerConfigUpdaterを呼ぶ側で制約を考慮しなくても、
    // 常に正しい状態が適用される
    const forceProxyDisabled = import.meta.env.VITE_USE_SERVER_PROXY === 'false';
    const hideCredentials = import.meta.env.VITE_HIDE_CREDENTIALS === 'true';
    const allowCredentialEdit = import.meta.env.VITE_ALLOW_CREDENTIAL_EDIT !== 'false';
    
    // 制約を考慮した最終的なuseServerProxy値を決定
    let finalUseServerProxy = serverConfig.useServerProxy;
    
    if (hideCredentials || !allowCredentialEdit) {
      // 認証情報保護またはクレデンシャル編集不可の場合はプロキシを強制
      finalUseServerProxy = true;
    } else if (forceProxyDisabled) {
      // 強制無効設定の場合はプロキシを無効
      finalUseServerProxy = false;
    }
    
    const finalServerConfig = {
      ...serverConfig,
      useServerProxy: finalUseServerProxy
    };
    
    dispatcher({ serverConfig: finalServerConfig });
    
    // LocalStorageに保存
    const saveToLocalStorageOrRemove = (key: string, value: string | boolean, defaultValue: string | boolean) => {
      if (value === defaultValue) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value.toString());
      }
    };

    saveToLocalStorageOrRemove('apiUrl', finalServerConfig.apiUrl, import.meta.env.VITE_WHISPER_API_URL || 'http://localhost:9000');
    saveToLocalStorageOrRemove('apiToken', finalServerConfig.apiToken, import.meta.env.VITE_WHISPER_API_TOKEN || '');
    saveToLocalStorageOrRemove('useAuth', finalServerConfig.useAuth, false);
    saveToLocalStorageOrRemove('useServerProxy', finalServerConfig.useServerProxy, import.meta.env.VITE_USE_SERVER_PROXY === 'true');
  };
}

export function useFFmpegPreInitStatusUpdater() {
  const dispatcher = useAppStateDispatcher();
  return (ffmpegPreInitStatus: AppState['ffmpegPreInitStatus']) => {
    dispatcher({ ffmpegPreInitStatus });
  };
}
