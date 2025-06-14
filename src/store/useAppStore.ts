import { StateStore, useStateSelector, useStateUpdater } from '../hooks/useStateManager';
import { AppState, createInitialAppState, selectApiStatus, selectUseTemperature, selectTemperature, selectUseVadFilter, selectPrompt, selectHotwords, selectFFmpegPreInitStatus } from './appState';
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
 * FFmpeg初期化状態を購読するhook
 */
export function useFFmpegPreInitStatus() {
  const store = useAppStore();
  const stableSelector = useCallback(selectFFmpegPreInitStatus, []);
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

export function useFFmpegPreInitStatusUpdater() {
  const dispatcher = useAppStateDispatcher();
  return (ffmpegPreInitStatus: AppState['ffmpegPreInitStatus']) => {
    dispatcher({ ffmpegPreInitStatus });
  };
}
