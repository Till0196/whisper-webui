import { ApiOptions, TranscriptionOptions } from '../types';

// APIオプションの状態型定義
export interface ApiOptionsState {
  // 現在のAPIオプション
  options: ApiOptions;
  
  // ローカルストレージに保存されたユーザー設定
  userSettings: {
    selectedModel: string;
    selectedLanguage: string;
    selectedTimestampGranularity: string;
    selectedResponseFormat: string;
  };
  
  // メタ情報
  loading: boolean;
  lastUpdated: number;
}

// ローカルストレージのキー
export const API_OPTIONS_STORAGE_KEY = 'whisper-webui-api-options';
export const USER_SETTINGS_STORAGE_KEY = 'whisper-webui-user-settings';

// ローカルストレージからAPIオプションを読み込み
export const loadApiOptionsFromStorage = (): ApiOptions | null => {
  try {
    const stored = localStorage.getItem(API_OPTIONS_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      // 1時間以内のデータのみ有効とする
      if (Date.now() - data.timestamp < 60 * 60 * 1000) {
        return data.options;
      }
    }
    return null;
  } catch (error) {
    console.warn('Failed to load API options from localStorage:', error);
    return null;
  }
};

// APIオプションをローカルストレージに保存
export const saveApiOptionsToStorage = (options: ApiOptions): void => {
  try {
    const data = {
      options,
      timestamp: Date.now()
    };
    localStorage.setItem(API_OPTIONS_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save API options to localStorage:', error);
  }
};

// ユーザー設定をローカルストレージから読み込み
export const loadUserSettingsFromStorage = (): ApiOptionsState['userSettings'] => {
  try {
    const stored = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load user settings from localStorage:', error);
  }
  
  // デフォルト値
  return {
    selectedModel: '',
    selectedLanguage: 'auto',
    selectedTimestampGranularity: 'segment',
    selectedResponseFormat: 'vtt'
  };
};

// ユーザー設定をローカルストレージに保存
export const saveUserSettingsToStorage = (settings: ApiOptionsState['userSettings']): void => {
  try {
    localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save user settings to localStorage:', error);
  }
};

// 初期状態を生成
export const createInitialApiOptionsState = (): ApiOptionsState => {
  // ローカルストレージからAPIオプションを読み込み
  const cachedOptions = loadApiOptionsFromStorage();
  const userSettings = loadUserSettingsFromStorage();

  return {
    options: cachedOptions || { 
      models: [], 
      responseFormats: [], 
      timestampGranularities: [], 
      languages: [] 
    },
    userSettings,
    loading: false,
    lastUpdated: cachedOptions ? Date.now() : 0
  };
};

// ユーザー設定とAPIオプションを比較して、有効な設定を取得
export const getValidatedUserSettings = (
  userSettings: ApiOptionsState['userSettings'], 
  apiOptions: ApiOptions
): ApiOptionsState['userSettings'] => {
  return {
    selectedModel: apiOptions.models.find(m => m.id === userSettings.selectedModel)?.id || 
                   (apiOptions.models.length > 0 ? apiOptions.models[0].id : ''),
    selectedLanguage: apiOptions.languages.includes(userSettings.selectedLanguage) ? 
                      userSettings.selectedLanguage : 'auto',
    selectedTimestampGranularity: apiOptions.timestampGranularities.includes(userSettings.selectedTimestampGranularity) ? 
                                  userSettings.selectedTimestampGranularity : 
                                  (apiOptions.timestampGranularities.length > 0 ? apiOptions.timestampGranularities[0] : 'segment'),
    selectedResponseFormat: apiOptions.responseFormats.includes(userSettings.selectedResponseFormat) ? 
                            userSettings.selectedResponseFormat : 
                            (apiOptions.responseFormats.length > 0 ? apiOptions.responseFormats[0] : 'vtt')
  };
};

// セレクター関数
export const selectApiOptions = (state: ApiOptionsState) => state.options;
export const selectUserSettings = (state: ApiOptionsState) => state.userSettings;
export const selectLoading = (state: ApiOptionsState) => state.loading;
export const selectLastUpdated = (state: ApiOptionsState) => state.lastUpdated;
export const selectSelectedModel = (state: ApiOptionsState) => state.userSettings.selectedModel;
export const selectSelectedLanguage = (state: ApiOptionsState) => state.userSettings.selectedLanguage;
export const selectSelectedTimestampGranularity = (state: ApiOptionsState) => state.userSettings.selectedTimestampGranularity;
export const selectSelectedResponseFormat = (state: ApiOptionsState) => state.userSettings.selectedResponseFormat;

// TranscriptionOptionsを生成するセレクター
export const selectTranscriptionOptionsFromApiState = (
  apiOptionsState: ApiOptionsState,
  appSettings: {
    useTemperature: boolean;
    temperature: number;
    useVadFilter: boolean;
    prompt: string;
    hotwords: string[];
  }
): TranscriptionOptions => {
  const { userSettings } = apiOptionsState;
  
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
};
