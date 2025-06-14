import { StateStore, useStateSelector, useStateUpdater } from '../hooks/useStateManager';
import { 
  ApiOptionsState, 
  createInitialApiOptionsState, 
  selectApiOptions, 
  selectUserSettings, 
  selectLoading, 
  selectSelectedModel,
  selectSelectedLanguage,
  selectSelectedTimestampGranularity,
  selectSelectedResponseFormat,
  saveApiOptionsToStorage,
  saveUserSettingsToStorage,
  getValidatedUserSettings
} from './apiOptionsState';
import { ApiOptions } from '../types';
import { useCallback, useMemo } from 'react';

// グローバルストア（シングルトン）
const globalApiOptionsStore = new StateStore(createInitialApiOptionsState());

/**
 * APIオプション状態を作成するhook（Appコンポーネントでのみ使用）
 */
export function useCreateApiOptionsState() {
  return globalApiOptionsStore;
}

/**
 * APIオプション状態を取得するhook（状態変更通知なし）
 */
export function useApiOptionsStore() {
  return globalApiOptionsStore;
}

/**
 * APIオプションを購読するhook
 */
export function useApiOptions() {
  const store = useApiOptionsStore();
  const stableSelector = useCallback(selectApiOptions, []);
  return useStateSelector(store, stableSelector);
}

/**
 * ユーザー設定を購読するhook
 */
export function useUserSettings() {
  const store = useApiOptionsStore();
  const stableSelector = useCallback(selectUserSettings, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 選択されたモデルを購読するhook
 */
export function useSelectedModel() {
  const store = useApiOptionsStore();
  const stableSelector = useCallback(selectSelectedModel, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 選択された言語を購読するhook
 */
export function useSelectedLanguage() {
  const store = useApiOptionsStore();
  const stableSelector = useCallback(selectSelectedLanguage, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 選択されたタイムスタンプ粒度を購読するhook
 */
export function useSelectedTimestampGranularity() {
  const store = useApiOptionsStore();
  const stableSelector = useCallback(selectSelectedTimestampGranularity, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 選択されたレスポンス形式を購読するhook
 */
export function useSelectedResponseFormat() {
  const store = useApiOptionsStore();
  const stableSelector = useCallback(selectSelectedResponseFormat, []);
  return useStateSelector(store, stableSelector);
}

/**
 * APIオプションのロード状態を購読するhook
 */
export function useApiOptionsLoading() {
  const store = useApiOptionsStore();
  const stableSelector = useCallback(selectLoading, []);
  return useStateSelector(store, stableSelector);
}

/**
 * APIオプション更新用hook
 */
export function useApiOptionsUpdater() {
  const store = useApiOptionsStore();
  const updateState = useStateUpdater(store);
  
  const updateApiOptions = useCallback((newOptions: ApiOptions) => {
    const currentState = store.getState();
    
    // ユーザー設定を新しいAPIオプションと照合
    const validatedSettings = getValidatedUserSettings(currentState.userSettings, newOptions);
    
    // ローカルストレージに保存
    saveApiOptionsToStorage(newOptions);
    saveUserSettingsToStorage(validatedSettings);
    
    // 状態を更新
    updateState({
      options: newOptions,
      userSettings: validatedSettings,
      loading: false,
      lastUpdated: Date.now()
    });
  }, [updateState]);

  return updateApiOptions;
}

/**
 * ユーザー設定更新用hook
 */
export function useUserSettingsUpdater() {
  const store = useApiOptionsStore();
  const updateState = useStateUpdater(store);
  
  const updateUserSettings = useCallback((newSettings: Partial<ApiOptionsState['userSettings']>) => {
    const currentState = store.getState();
    const updatedSettings = { ...currentState.userSettings, ...newSettings };
    
    // ローカルストレージに保存
    saveUserSettingsToStorage(updatedSettings);
    
    // 状態を更新
    updateState({
      userSettings: updatedSettings
    });
  }, [updateState]);

  return updateUserSettings;
}

/**
 * 個別設定更新用のヘルパーhook群
 */
export function useSelectedModelUpdater() {
  const updateUserSettings = useUserSettingsUpdater();
  return (selectedModel: string) => {
    updateUserSettings({ selectedModel });
  };
}

export function useSelectedLanguageUpdater() {
  const updateUserSettings = useUserSettingsUpdater();
  return (selectedLanguage: string) => {
    updateUserSettings({ selectedLanguage });
  };
}

export function useSelectedTimestampGranularityUpdater() {
  const updateUserSettings = useUserSettingsUpdater();
  return (selectedTimestampGranularity: string) => {
    updateUserSettings({ selectedTimestampGranularity });
  };
}

export function useSelectedResponseFormatUpdater() {
  const updateUserSettings = useUserSettingsUpdater();
  return (selectedResponseFormat: string) => {
    updateUserSettings({ selectedResponseFormat });
  };
}

/**
 * ローディング状態更新用hook
 */
export function useApiOptionsLoadingUpdater() {
  const store = useApiOptionsStore();
  const updateState = useStateUpdater(store);
  
  return (loading: boolean) => {
    updateState({ loading });
  };
}

/**
 * TranscriptionOptionsを購読するhook
 * appStateから必要な設定を受け取る
 */
export function useTranscriptionOptionsFromApiState(appSettings: {
  useTemperature: boolean;
  temperature: number;
  useVadFilter: boolean;
  prompt: string;
  hotwords: string[];
}) {
  const userSettings = useUserSettings();
  
  return useMemo(() => {
    return {
      model: userSettings.selectedModel,
      language: userSettings.selectedLanguage !== 'auto' ? userSettings.selectedLanguage : undefined,
      responseFormat: userSettings.selectedResponseFormat,
      timestampGranularity: userSettings.selectedTimestampGranularity,
      temperature: appSettings.useTemperature ? appSettings.temperature : undefined,
      prompt: appSettings.prompt || undefined,
      hotwords: appSettings.hotwords.length > 0 ? appSettings.hotwords : undefined,
      task: 'transcribe' as const,
      useVadFilter: appSettings.useVadFilter
    };
  }, [userSettings, appSettings]);
}
