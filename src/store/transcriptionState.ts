import { TranscriptionSegment, LogEntry, ProcessingState, ProcessingSteps } from '../types';

// 処理ステップの初期状態を作成する関数
export const createInitialProcessingSteps = (): ProcessingSteps => ({
  ffmpegInit: {
    id: 'ffmpegInit',
    titleKey: 'steps.ffmpegInit',
    status: 'pending',
    progress: 0,
    type: 'normal'
  },
  fileValidation: {
    id: 'fileValidation',
    titleKey: 'steps.fileValidation',
    status: 'pending',
    progress: 0,
    type: 'normal'
  },
  audioConversion: {
    id: 'audioConversion',
    titleKey: 'steps.audioConversion',
    status: 'pending',
    progress: 0,
    type: 'normal'
  },
  audioSplitting: {
    id: 'audioSplitting',
    titleKey: 'steps.audioSplitting',
    status: 'pending',
    progress: 0,
    type: 'normal'
  },
  chunks: [], // 動的に作成される
  finalizing: {
    id: 'finalizing',
    titleKey: 'steps.finalizing',
    status: 'pending',
    progress: 0,
    type: 'normal'
  }
});

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
  
  // 処理状態
  processingState: ProcessingState;
}

// 初期状態を生成する関数
export const createInitialTranscriptionState = (): TranscriptionState => ({
  transcription: [],
  logs: [],
  processingTime: undefined,
  isProcessingComplete: false,
  originalFileName: '',
  totalDuration: 0,
  lastEndTime: 0,
  processingState: {
    isProcessing: false,
    progress: 0,
    status: '',
    currentStep: '',
    stepProgress: 0,
    currentChunk: 0,
    totalChunks: 0,
    isFFmpegInitializing: false,
    hasFFmpegStarted: false,
    steps: createInitialProcessingSteps()
  }
});

// セレクター関数
export const selectTranscription = (state: TranscriptionState) => state.transcription;
export const selectLogs = (state: TranscriptionState) => state.logs;
export const selectProcessingTime = (state: TranscriptionState) => state.processingTime;
export const selectIsProcessingComplete = (state: TranscriptionState) => state.isProcessingComplete;
export const selectOriginalFileName = (state: TranscriptionState) => state.originalFileName;
export const selectTotalDuration = (state: TranscriptionState) => state.totalDuration;
export const selectLastEndTime = (state: TranscriptionState) => state.lastEndTime;
export const selectProcessingState = (state: TranscriptionState) => state.processingState;

// 複合セレクター
export const selectIsProcessing = (state: TranscriptionState) => state.processingState.isProcessing;
export const selectProgress = (state: TranscriptionState) => state.processingState.progress;
export const selectCurrentStep = (state: TranscriptionState) => state.processingState.currentStep;
export const selectStatus = (state: TranscriptionState) => state.processingState.status;
export const selectProcessingSteps = (state: TranscriptionState) => state.processingState.steps;
