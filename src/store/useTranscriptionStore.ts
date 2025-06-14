import { StateStore, useStateSelector, useStateUpdater } from '../hooks/useStateManager';
import { TranscriptionSegment, LogEntry, ProcessingState, ProcessingSteps } from '../types';
import { 
  createInitialTranscriptionState,
  selectTranscription,
  selectLogs,
  selectProcessingTime,
  selectIsProcessingComplete,
  selectOriginalFileName,
  selectTotalDuration,
  selectProcessingState,
  selectIsProcessing,
  selectProgress,
  selectProcessingSteps
} from './transcriptionState';
import { useCallback } from 'react';

// グローバル転写ストア（シングルトン）
const globalTranscriptionStore = new StateStore(createInitialTranscriptionState());

/**
 * 転写状態を作成するhook（Appコンポーネントでのみ使用）
 */
export function useCreateTranscriptionState() {
  return globalTranscriptionStore;
}

/**
 * 転写状態を取得するhook（状態変更通知なし）
 */
export function useTranscriptionStore() {
  return globalTranscriptionStore;
}

/**
 * 転写結果を購読するhook
 */
export function useTranscriptionResult() {
  const store = useTranscriptionStore();
  const stableSelector = useCallback(selectTranscription, []);
  return useStateSelector(store, stableSelector);
}

/**
 * ログを購読するhook
 */
export function useTranscriptionLogs() {
  const store = useTranscriptionStore();
  const stableSelector = useCallback(selectLogs, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 処理時間を購読するhook
 */
export function useProcessingTime() {
  const store = useTranscriptionStore();
  const stableSelector = useCallback(selectProcessingTime, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 処理完了状態を購読するhook
 */
export function useIsProcessingComplete() {
  const store = useTranscriptionStore();
  const stableSelector = useCallback(selectIsProcessingComplete, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 元ファイル名を購読するhook
 */
export function useOriginalFileName() {
  const store = useTranscriptionStore();
  const stableSelector = useCallback(selectOriginalFileName, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 処理状態を購読するhook
 */
export function useTranscriptionProcessingState() {
  const store = useTranscriptionStore();
  const stableSelector = useCallback(selectProcessingState, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 総再生時間を購読するhook
 */
export function useTotalDuration() {
  const store = useTranscriptionStore();
  const stableSelector = useCallback(selectTotalDuration, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 処理中かどうかを購読するhook
 */
export function useIsProcessing() {
  const store = useTranscriptionStore();
  const stableSelector = useCallback(selectIsProcessing, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 進捗を購読するhook
 */
export function useTranscriptionProgress() {
  const store = useTranscriptionStore();
  const stableSelector = useCallback(selectProgress, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 処理ステップを購読するhook
 */
export function useProcessingSteps() {
  const store = useTranscriptionStore();
  const stableSelector = useCallback(selectProcessingSteps, []);
  return useStateSelector(store, stableSelector);
}

/**
 * ステップ進捗を購読するhook
 */
export function useStepProgress() {
  const store = useTranscriptionStore();
  const stableSelector = useCallback((state: ReturnType<typeof createInitialTranscriptionState>) => state.processingState.stepProgress, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 現在のステータスを購読するhook
 */
export function useCurrentStatus() {
  const store = useTranscriptionStore();
  const stableSelector = useCallback((state: ReturnType<typeof createInitialTranscriptionState>) => state.processingState.status, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 状態更新用のディスパッチャーを取得するhook
 */
export function useTranscriptionStateDispatcher() {
  const store = useTranscriptionStore();
  return useCallback(() => useStateUpdater(store), [store])();
}

/**
 * 転写結果を更新するhook
 */
export function useTranscriptionResultUpdater() {
  const dispatcher = useTranscriptionStateDispatcher();
  return useCallback((transcription: TranscriptionSegment[]) => {
    dispatcher({ transcription });
  }, [dispatcher]);
}

/**
 * ログを更新するhook
 */
export function useTranscriptionLogsUpdater() {
  const dispatcher = useTranscriptionStateDispatcher();
  return useCallback((logs: LogEntry[]) => {
    dispatcher({ logs });
  }, [dispatcher]);
}

/**
 * ログを追加するhook
 */
export function useAddLogUpdater() {
  const dispatcher = useTranscriptionStateDispatcher();
  const store = useTranscriptionStore();
  
  return useCallback((newLog: LogEntry) => {
    const currentLogs = store.getState().logs;
    dispatcher({ logs: [...currentLogs, newLog] });
  }, [dispatcher, store]);
}

/**
 * ログをクリアするhook
 */
export function useClearLogsUpdater() {
  const dispatcher = useTranscriptionStateDispatcher();
  return useCallback(() => {
    dispatcher({ logs: [] });
  }, [dispatcher]);
}

/**
 * 処理状態を更新するhook
 */
export function useProcessingStateUpdater() {
  const dispatcher = useTranscriptionStateDispatcher();
  return useCallback((processingState: Partial<ProcessingState>) => {
    const store = useTranscriptionStore();
    const currentState = store.getState();
    
    // 完全な新しい状態オブジェクトを作成
    const newState = {
      ...currentState,
      processingState: { ...currentState.processingState, ...processingState }
    };
    
    dispatcher(newState);
  }, [dispatcher]);
}

/**
 * 処理時間を更新するhook
 */
export function useProcessingTimeUpdater() {
  const dispatcher = useTranscriptionStateDispatcher();
  return useCallback((processingTime: number | undefined) => {
    dispatcher({ processingTime });
  }, [dispatcher]);
}

/**
 * 元ファイル名を更新するhook
 */
export function useOriginalFileNameUpdater() {
  const dispatcher = useTranscriptionStateDispatcher();
  return useCallback((originalFileName: string) => {
    dispatcher({ originalFileName });
  }, [dispatcher]);
}

/**
 * 処理完了状態を更新するhook
 */
export function useIsProcessingCompleteUpdater() {
  const dispatcher = useTranscriptionStateDispatcher();
  return useCallback((isProcessingComplete: boolean) => {
    dispatcher({ isProcessingComplete });
  }, [dispatcher]);
}

/**
 * 総再生時間を更新するhook
 */
export function useTotalDurationUpdater() {
  const dispatcher = useTranscriptionStateDispatcher();
  return useCallback((totalDuration: number) => {
    dispatcher({ totalDuration });
  }, [dispatcher]);
}

/**
 * 最後の終了時間を更新するhook
 */
export function useLastEndTimeUpdater() {
  const dispatcher = useTranscriptionStateDispatcher();
  return useCallback((lastEndTime: number) => {
    dispatcher({ lastEndTime });
  }, [dispatcher]);
}

/**
 * 処理ステップを更新するhook
 */
export function useProcessingStepsUpdater() {
  const dispatcher = useTranscriptionStateDispatcher();
  const store = useTranscriptionStore();
  
  return useCallback((updater: (steps: ProcessingSteps) => ProcessingSteps) => {
    const currentState = store.getState();
    const newSteps = updater(currentState.processingState.steps);
    
    // 完全な新しい状態オブジェクトを作成（深いコピー）
    const newState = {
      ...currentState,
      processingState: { 
        ...currentState.processingState, 
        steps: newSteps 
      }
    };
    
    dispatcher(newState);
  }, [dispatcher, store]);
}

/**
 * 転写状態をリセットするhook
 */
export function useResetTranscriptionStateUpdater() {
  const dispatcher = useTranscriptionStateDispatcher();
  return useCallback(() => {
    dispatcher(createInitialTranscriptionState());
  }, [dispatcher]);
}
