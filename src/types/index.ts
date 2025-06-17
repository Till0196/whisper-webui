// 型定義のメインエクスポートファイル
// 各カテゴリーの型を再エクスポート

// API関連の型
export * from './api';

// 転写関連の型  
export * from './transcription';

// 処理ステップ関連の型
export * from './processing';

// 設定関連の型
export * from './config';

// ユーティリティ型
export * from './utils';

// Global type declarations
declare global {
  interface Window {
    lastCalculatedDuration?: number;
  }
}

// 後方互換性のための型エイリアス（必要に応じて）
export type { 
  TranscriptionSegment as Segment,
  TranscriptionResult as Result 
} from './transcription';

export type {
  ProcessingState as Processing,
  ProcessingStep as Step
} from './processing';
