import { useCallback } from 'react';
import { TranscriptionOptions } from '../types';
import { TranscriptionService, TranscriptionServiceCallbacks } from '../services/transcriptionService';
import { getFFmpegInstanceSync } from '../lib/ffmpeg';
import { 
  useTranscriptionResult,
  useTranscriptionLogs,
  useProcessingTime,
  useIsProcessingComplete,
  useOriginalFileName,
  useTranscriptionProcessingState,
  useTotalDuration,
  useTranscriptionResultUpdater,
  useAddLogUpdater,
  useClearLogsUpdater,
  useProcessingStateUpdater,
  useProcessingTimeUpdater,
  useOriginalFileNameUpdater,
  useIsProcessingCompleteUpdater,
  useResetTranscriptionStateUpdater,
  useTotalDurationUpdater,
  useLastEndTimeUpdater,
  useProcessingStepsUpdater
} from '../store/useTranscriptionStore';

export const useTranscription = (t: (key: string, params?: any) => string) => {
  // ストアから状態を購読
  const transcription = useTranscriptionResult();
  const logs = useTranscriptionLogs();
  const processingTime = useProcessingTime();
  const isProcessingComplete = useIsProcessingComplete();
  const originalFileName = useOriginalFileName();
  const processingState = useTranscriptionProcessingState();
  const totalDuration = useTotalDuration();

  // 状態更新用のディスパッチャー
  const setTranscription = useTranscriptionResultUpdater();
  const addLog = useAddLogUpdater();
  const clearLogsUpdater = useClearLogsUpdater();
  const updateProcessingState = useProcessingStateUpdater();
  const setProcessingTime = useProcessingTimeUpdater();
  const setOriginalFileName = useOriginalFileNameUpdater();
  const setIsProcessingComplete = useIsProcessingCompleteUpdater();
  const resetTranscriptionState = useResetTranscriptionStateUpdater();
  const setTotalDuration = useTotalDurationUpdater();
  const setLastEndTime = useLastEndTimeUpdater();
  const updateProcessingSteps = useProcessingStepsUpdater();

  // FFmpegインスタンス（シングルトン）
  const ffmpeg = getFFmpegInstanceSync();

  // 補助関数の定義
  const addFFmpegLog = useCallback((message: string) => {
    addLog({
      type: 'info',
      message: `[FFmpeg] ${message}`,
      timestamp: new Date().toISOString()
    });
  }, [addLog]);

  const updateSegments = useCallback((segments: typeof transcription) => {
    setTranscription(segments);
  }, [setTranscription]);

  // i18n対応のログ追加関数
  const addLogWithTranslation = useCallback((type: 'info' | 'error' | 'success' | 'debug', messageKey: string, params?: Record<string, any>) => {
    // 翻訳キーを使用してメッセージを翻訳
    const translatedMessage = t(messageKey, params);
    
    addLog({
      type,
      message: translatedMessage,
      timestamp: new Date().toISOString(),
      translationKey: messageKey,
      translationParams: params
    });
  }, [addLog, t]);

  const updateProcessingStateWithTranslation = useCallback((state: Partial<typeof processingState>) => {
    // currentStepとstatusで翻訳が必要な場合は翻訳を適用
    const updatedState = { ...state };
    
    if (state.currentStep) {
      if (state.currentStep.startsWith('logs.')) {
        // 翻訳キーの場合（パラメータも渡す）
        const params = state.currentStep === 'logs.processingChunk' && 
          (updatedState.currentChunk || state.currentChunk) && 
          (updatedState.totalChunks || state.totalChunks) ? {
          current: updatedState.currentChunk || state.currentChunk,
          total: updatedState.totalChunks || state.totalChunks
        } : undefined;
        updatedState.currentStep = t(state.currentStep, params);
      } else if (state.currentStep.includes('チャンク') && state.currentChunk && state.totalChunks) {
        // 従来のチャンク処理メッセージを翻訳
        updatedState.currentStep = t('logs.processingChunk', { 
          current: state.currentChunk, 
          total: state.totalChunks 
        });
      }
    }
    
    if (state.status) {
      if (state.status.startsWith('logs.')) {
        // 翻訳キーの場合（パラメータも渡す）
        const params = state.status === 'logs.processingChunk' && 
          (updatedState.currentChunk || state.currentChunk) && 
          (updatedState.totalChunks || state.totalChunks) ? {
          current: updatedState.currentChunk || state.currentChunk,
          total: updatedState.totalChunks || state.totalChunks
        } : undefined;
        updatedState.status = t(state.status, params);
      } else if (state.status.includes('チャンク') && state.currentChunk && state.totalChunks) {
        // 従来のステータスメッセージを翻訳
        updatedState.status = t('logs.processingChunk', { 
          current: state.currentChunk, 
          total: state.totalChunks 
        });
      } else if (state.status.includes('文字起こし中') && state.status.includes('%')) {
        // 進捗付きの文字起こしメッセージ
        const progressMatch = state.status.match(/([\d.]+)%/);
        if (progressMatch) {
          updatedState.status = `${t('processing.transcribing')}... ${progressMatch[1]}%`;
        }
      }
    }
    
    updateProcessingState(updatedState);
  }, [updateProcessingState, t]);

  const updateProgress = useCallback((progress: number, forceUpdate = false) => {
    // forceUpdateが true の場合は保護なしで更新（リセット時など）
    if (forceUpdate) {
      updateProcessingState({ progress: Math.min(100, Math.max(0, progress)) });
      return;
    }
    
    // 通常の場合は進捗が減らないように保護（ただし、現在の処理中のみ）
    if (processingState.isProcessing) {
      const newProgress = Math.max(processingState.progress, Math.min(100, Math.max(0, progress)));
      updateProcessingState({ progress: newProgress });
    } else {
      // 処理中でない場合は直接設定
      updateProcessingState({ progress: Math.min(100, Math.max(0, progress)) });
    }
  }, [updateProcessingState, processingState.isProcessing, processingState.progress]);

  const processFile = useCallback(async (
    file: File,
    options: TranscriptionOptions,
    apiConfig: {
      baseUrl: string | undefined;
      token?: string;
      useServerProxy: boolean;
    }
  ) => {
    try {
      // 状態を完全にリセット（連続処理に対応）
      setTranscription([]);
      clearLogsUpdater();
      setProcessingTime(undefined);
      setIsProcessingComplete(false); // 完了フラグを明示的にfalseに
      setOriginalFileName(file.name);
      setTotalDuration(0);
      setLastEndTime(0);
      
      // 進捗を強制的に0%にリセット
      updateProcessingState({
        isProcessing: true,
        progress: 0, // 明確に0%に設定
        status: t('processing.uploading'),
        currentStep: '',
        stepProgress: 0,
        currentChunk: 0,
        totalChunks: 0,
        isFFmpegInitializing: false,
        hasFFmpegStarted: false
      });
      
      // 進捗を強制的にリセット
      updateProgress(0, true); // forceUpdate = true でリセット

      // すべてのステップを「待機中」状態にリセット
      updateProcessingSteps(steps => ({
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
        finalizing: {
          id: 'finalizing',
          titleKey: 'steps.finalizing',
          status: 'pending',
          progress: 0,
          type: 'normal'
        },
        chunks: [] // チャンクステップもクリア
      }));

      const callbacks: TranscriptionServiceCallbacks = {
        onLog: addLogWithTranslation,
        onFFmpegLog: addFFmpegLog,
        onStateUpdate: updateProcessingState,
        onProgress: updateProgress,
        onSegmentsUpdate: updateSegments,
        onStepsUpdate: updateProcessingSteps
      };

      const service = new TranscriptionService(ffmpeg, callbacks, t);
      const result = await service.processFile(file, options, apiConfig);

      // セグメントは既にリアルタイムで更新されているため、ここでは設定しない
      setProcessingTime(result.processingTime);
      setIsProcessingComplete(true);
      updateProcessingState({ 
        isProcessing: false, // 処理完了時はfalseに設定
        progress: 100, 
        currentStep: 'complete',
        stepProgress: 100 
      });

    } catch (error) {
      // エラーログは本番でも出力（重要な情報のため）
      console.error('Error processing file:', error);
      addLogWithTranslation('error', 'errors.processingFailed', { error: error instanceof Error ? error.message : String(error) });
      // エラー状態を設定
      updateProcessingState({
        isProcessing: false,
        progress: 0, // エラー時は進捗もリセット
        currentStep: 'error',
        stepProgress: 0,
        currentChunk: 0,
        totalChunks: 0
      });
      setIsProcessingComplete(false); // エラー時も完了フラグをfalseに
      return; // エラー時は早期リターン
    } finally {
      // finallyブロックで確実に処理中フラグをfalseに設定
      updateProcessingState({
        isProcessing: false,
        currentChunk: 0,
        totalChunks: 0
      });
    }
  }, [ffmpeg, addLogWithTranslation, addFFmpegLog, updateProcessingState, updateProgress, updateSegments, setTranscription, clearLogsUpdater, setProcessingTime, setIsProcessingComplete, setOriginalFileName, setTotalDuration, setLastEndTime, t]);

  const handleCopy = useCallback(() => {
    const text = transcription.map(segment => segment.text).join('\n');
    navigator.clipboard.writeText(text);
    addLogWithTranslation('success', 'logs.copiedToClipboard');
  }, [transcription, addLogWithTranslation]);

  const clearLogs = useCallback(() => {
    clearLogsUpdater();
  }, [clearLogsUpdater]);

  const resetProgress = useCallback(() => {
    updateProcessingState({
      progress: 0,
      stepProgress: 0,
      currentStep: '',
      status: '',
      currentChunk: 0,
      totalChunks: 0,
      isProcessing: false
    });
    setIsProcessingComplete(false); // 完了フラグもリセット
    updateProgress(0, true); // 強制的に0%にリセット

    // すべてのステップを「待機中」状態にリセット
    updateProcessingSteps(steps => ({
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
      finalizing: {
        id: 'finalizing',
        titleKey: 'steps.finalizing',
        status: 'pending',
        progress: 0,
        type: 'normal'
      },
      chunks: [] // チャンクステップもクリア
    }));
  }, [updateProgress, updateProcessingState, setIsProcessingComplete, updateProcessingSteps]);

  return {
    // 状態
    transcription,
    logs,
    processingTime,
    isProcessingComplete,
    originalFileName,
    totalDuration,
    processingState,
    
    // アクション
    processFile,
    handleCopy,
    clearLogs,
    resetProgress // 新しい関数を追加
  };
}; 