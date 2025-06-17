// 処理ステップ関連の型定義

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

// FFmpeg初期化状態の型定義
export interface FFmpegInitStatus {
  isInitializing: boolean;
  isInitialized: boolean;
  initError: string | null;
}
