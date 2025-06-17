// API関連の型定義

export interface ApiStatus {
  status: 'unknown' | 'healthy' | 'error';
  message: string;
  details: string;
}

export interface Model {
  id: string;
  task: string;
  language: string[] | null;
}

export interface ApiOptions {
  models: Model[];
  responseFormats: string[];
  timestampGranularities: string[];
  languages: string[];
}

export interface TranscriptionOptions {
  model: string;
  language?: string;
  responseFormat?: string;
  timestampGranularity?: string;
  temperature?: number;
  prompt?: string;
  hotwords?: string[];
  task?: 'transcribe' | 'translate';
  useVadFilter?: boolean;
}

// APIオプション状態管理用の型
export interface UserSettings {
  selectedModel: string;
  selectedLanguage: string;
  selectedTimestampGranularity: string;
  selectedResponseFormat: string;
}

// APIオプション状態の型
export interface ApiOptionsState {
  options: ApiOptions;
  userSettings: UserSettings;
  loading: boolean;
  lastUpdated: number;
}
