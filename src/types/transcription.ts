// 転写関連の型定義

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

export interface TranscriptionResult {
  segments: TranscriptionSegment[];
  processingTime: number;
  originalFileName: string;
}

// ログエントリーの型定義
export type LogEntry = {
  type: 'info' | 'error' | 'success' | 'debug';
  message: string;
  timestamp: string;
  translationKey?: string;
  translationParams?: Record<string, any>;
};

// 転写状態の型定義
export interface TranscriptionState {
  // データ
  transcription: TranscriptionSegment[];
  logs: LogEntry[];
  processingTime?: number;
  isProcessingComplete: boolean;
  originalFileName: string;
  totalDuration: number;
  lastEndTime: number;
  
  // 処理状態への参照（型参照のみ、import不要）
  processingState: import('./processing').ProcessingState;
}
