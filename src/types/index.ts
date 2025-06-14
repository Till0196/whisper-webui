export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
  words: {
    word: string;
    start: number;
    end: number;
    probability: number;
  }[] | null;
}

export type LogEntry = {
  type: 'info' | 'error' | 'success' | 'debug';
  message: string;
  timestamp: string;
  translationKey?: string;
  translationParams?: Record<string, any>;
};

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

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  status: string;
  currentStep: string;
  stepProgress: number;
  currentChunk: number;
  totalChunks: number;
  isFFmpegInitializing: boolean;
  hasFFmpegStarted: boolean;
  // 新しいステップ管理
  steps: ProcessingSteps;
}

export interface TranscriptionResult {
  segments: TranscriptionSegment[];
  processingTime: number;
  originalFileName: string;
}

export type Language = 'ja' | 'en';

export type LanguageNames = {
  [key in Language]: {
    [key: string]: string;
  };
};

// 処理ステップの状態
export type ProcessingStepStatus = 'pending' | 'inProgress' | 'completed' | 'error' | 'skipped';

export interface ProcessingStep {
  id: string;
  titleKey: string; // 翻訳キー
  titleParams?: Record<string, any>; // 翻訳パラメータ
  status: ProcessingStepStatus;
  details?: string; // 詳細情報（チャンク番号など）
  error?: string; // エラーメッセージ
  progress?: number; // 進捗率（0-100）
  skipReason?: string; // スキップ理由
  type?: 'chunk' | 'normal'; // ステップの種類
}

export interface ProcessingSteps {
  ffmpegInit: ProcessingStep;
  fileValidation: ProcessingStep;
  audioConversion: ProcessingStep;
  audioSplitting: ProcessingStep;
  chunks: ProcessingStep[]; // 各チャンクの処理ステップ
  finalizing: ProcessingStep;
} 