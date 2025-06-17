import { FFmpeg } from '@ffmpeg/ffmpeg';
import { TranscriptionSegment, TranscriptionOptions, LogEntry, ProcessingState, TranscriptionResult, ProcessingSteps, ProcessingStep } from '../types';
import { convertToWav, splitIntoChunks, getAudioDuration, ensureFFmpegLoaded } from '../lib/ffmpeg';
import { transcribeAudioChunk } from '../lib/whisperApi';

// 処理ステップの管理機能
export const createChunkSteps = (chunkCount: number): ProcessingStep[] => {
  return Array.from({ length: chunkCount }, (_, i) => ({
    id: getChunkStepId(i),
    titleKey: chunkCount === 1 ? 'steps.transcription' : 'steps.chunkProcessing',
    titleParams: chunkCount > 1 ? { current: i + 1, total: chunkCount } : undefined,
    status: 'pending',
    progress: 0,
    type: 'chunk'
  }));
};

export const updateStepStatus = (
  steps: ProcessingSteps,
  stepId: string,
  status: ProcessingStep['status'],
  error?: string,
  skipReason?: string
): ProcessingSteps => {
  // 完全に新しいオブジェクトを作成
  const updatedSteps: ProcessingSteps = {
    ffmpegInit: { ...steps.ffmpegInit },
    fileValidation: { ...steps.fileValidation },
    audioConversion: { ...steps.audioConversion },
    audioSplitting: { ...steps.audioSplitting },
    chunks: steps.chunks.map(chunk => ({ ...chunk })),
    finalizing: { ...steps.finalizing }
  };
  
  if (stepId.startsWith('chunk_')) {
    // チャンクステップの更新
    const chunkIndex = parseInt(stepId.split('_')[1]);
    if (!isNaN(chunkIndex) && chunkIndex < updatedSteps.chunks.length) {
      updatedSteps.chunks[chunkIndex] = {
        ...updatedSteps.chunks[chunkIndex],
        status,
        error,
        skipReason
      };
    }
  } else {
    // 通常のステップの更新
    const step = updatedSteps[stepId as keyof Omit<ProcessingSteps, 'chunks'>];
    if (step) {
      updatedSteps[stepId as keyof Omit<ProcessingSteps, 'chunks'>] = {
        ...step,
        status,
        error,
        skipReason
      };
    }
  }
  
  return updatedSteps;
};

export const updateStepProgress = (
  steps: ProcessingSteps,
  stepId: string,
  progress: number
): ProcessingSteps => {
  // 完全に新しいオブジェクトを作成
  const updatedSteps: ProcessingSteps = {
    ffmpegInit: { ...steps.ffmpegInit },
    fileValidation: { ...steps.fileValidation },
    audioConversion: { ...steps.audioConversion },
    audioSplitting: { ...steps.audioSplitting },
    chunks: steps.chunks.map(chunk => ({ ...chunk })),
    finalizing: { ...steps.finalizing }
  };
  
  if (stepId.startsWith('chunk_')) {
    // チャンクステップの更新
    const chunkIndex = parseInt(stepId.split('_')[1]);
    if (!isNaN(chunkIndex) && chunkIndex < updatedSteps.chunks.length) {
      updatedSteps.chunks[chunkIndex] = {
        ...updatedSteps.chunks[chunkIndex],
        progress
      };
    }
  } else {
    // 通常のステップの更新
    const step = updatedSteps[stepId as keyof Omit<ProcessingSteps, 'chunks'>];
    if (step) {
      updatedSteps[stepId as keyof Omit<ProcessingSteps, 'chunks'>] = {
        ...step,
        progress
      };
    }
  }
  
  return updatedSteps;
};

export const getChunkStepId = (index: number): string => {
  return `chunk_${index}`;
};

export interface TranscriptionServiceCallbacks {
  onLog: (type: LogEntry['type'], messageKey: string, params?: Record<string, any>) => void;
  onFFmpegLog: (message: string) => void;
  onStateUpdate: (state: Partial<ProcessingState>) => void;
  onProgress: (progress: number) => void;
  onSegmentsUpdate: (segments: TranscriptionSegment[]) => void;
  onStepsUpdate: (updater: (steps: ProcessingSteps) => ProcessingSteps) => void;
}

export class TranscriptionService {
  private ffmpeg: FFmpeg;
  private callbacks: TranscriptionServiceCallbacks;
  private t: (key: string, params?: Record<string, any>) => string;

  constructor(
    ffmpeg: FFmpeg, 
    callbacks: TranscriptionServiceCallbacks,
    t: (key: string, params?: Record<string, any>) => string
  ) {
    this.ffmpeg = ffmpeg;
    this.callbacks = callbacks;
    this.t = t;
  }

  async processFile(
    file: File,
    options: TranscriptionOptions,
    apiConfig: {
      baseUrl: string | undefined;
      token?: string;
      useServerProxy: boolean;
    }
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();
    let hasFFmpegStarted = false;

    try {
      // 処理開始時に状態を完全にリセット
      this.callbacks.onProgress(0);
      this.callbacks.onStateUpdate({
        isProcessing: true,
        progress: 0,
        stepProgress: 0,
        currentChunk: 0,
        totalChunks: 0,
        currentStep: '',
        status: '',
        isFFmpegInitializing: false,
        hasFFmpegStarted: false
      });

      // すべてのステップを「待機中」状態にリセット
      this.callbacks.onStepsUpdate(steps => ({
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
      
      // ステップ1: ファイル検証開始
      this.callbacks.onStepsUpdate(steps => updateStepStatus(steps, 'fileValidation', 'inProgress'));
      this.callbacks.onStepsUpdate(steps => updateStepProgress(steps, 'fileValidation', 50));
      this.callbacks.onLog('info', 'logs.processingStart', { fileName: file.name, fileSize: file.size });

      // ファイル検証完了
      this.callbacks.onStepsUpdate(steps => updateStepProgress(steps, 'fileValidation', 100));
      this.callbacks.onStepsUpdate(steps => updateStepStatus(steps, 'fileValidation', 'completed'));

      // ステップ2: FFmpeg初期化開始
      this.callbacks.onStepsUpdate(steps => updateStepStatus(steps, 'ffmpegInit', 'inProgress'));
      this.callbacks.onStateUpdate({
        isFFmpegInitializing: true,
        currentStep: 'processing.initializingFFmpeg',
        status: 'processing.initializingFFmpeg'
      });

      try {
        await ensureFFmpegLoaded(this.ffmpeg);
        hasFFmpegStarted = true;
        this.callbacks.onStepsUpdate(steps => updateStepStatus(steps, 'ffmpegInit', 'completed'));
        this.callbacks.onLog('success', 'logs.ffmpegInitialized');
      } catch (error) {
        this.callbacks.onStepsUpdate(steps => updateStepStatus(steps, 'ffmpegInit', 'error', 
          error instanceof Error ? error.message : 'Unknown error'));
        this.callbacks.onLog('error', 'logs.ffmpegInitializationFailed');
        throw error;
      } finally {
        this.callbacks.onStateUpdate({ isFFmpegInitializing: false });
      }

      // ステップ3: 音声変換開始
      this.callbacks.onStepsUpdate(steps => updateStepStatus(steps, 'audioConversion', 'inProgress'));
      this.callbacks.onStateUpdate({
        currentStep: 'processing.converting',
        status: 'processing.converting',
        stepProgress: 0
      });

      // 進捗更新の最適化のためのデバウンス変数
      let lastProgressUpdate = 0;
      let lastProgress = 0;
      const updateDebounceMs = 1000; // 更新間隔を1秒に制限

      const { data: wavData, duration } = await convertToWav(file, this.ffmpeg, (progress: number) => {
        // 進捗更新の頻度を制限（1%刻みで更新かつ時間間隔も考慮）
        const roundedProgress = Math.round(progress);
        const now = Date.now();

        // 進捗値が変化していて、かつ前回の更新から一定時間経過している場合のみ更新
        if ((roundedProgress > lastProgress) && (now - lastProgressUpdate >= updateDebounceMs)) {
          lastProgress = roundedProgress;
          lastProgressUpdate = now;

          // ステップの進捗も更新
          this.callbacks.onStepsUpdate(steps => updateStepProgress(steps, 'audioConversion', roundedProgress));
          this.callbacks.onStateUpdate({ 
            stepProgress: roundedProgress,
            status: this.t('processing.converting', { progress: roundedProgress.toFixed(1) })
          });
          this.callbacks.onProgress(roundedProgress * 0.3); // 変換は全体の30%
        }
      }, this.callbacks.onFFmpegLog);

      // 音声変換完了
      this.callbacks.onStepsUpdate(steps => updateStepStatus(steps, 'audioConversion', 'completed'));
      this.callbacks.onLog('success', 'logs.conversionComplete');

      // 音声の長さを設定
      window.lastCalculatedDuration = duration;
      this.callbacks.onLog('success', 'logs.durationRetrieved', { duration: duration.toFixed(2) });

      // ステップ4: チャンク分割開始
      this.callbacks.onStepsUpdate(steps => updateStepStatus(steps, 'audioSplitting', 'inProgress'));
      this.callbacks.onStateUpdate({
        currentStep: 'processing.splitting',
        status: 'processing.splitting',
        stepProgress: 0
      });
      this.callbacks.onLog('info', 'logs.splittingIntoChunks');

      // 進捗更新の最適化のためのデバウンス変数
      let lastSplittingUpdate = 0;
      let lastSplittingProgress = 0;
      const splittingDebounceMs = 1000; // 1秒間隔で更新

      const chunks = await splitIntoChunks(wavData, this.ffmpeg, (progress: number) => {
        // 進捗更新の頻度を制限（1%刻みで更新かつ時間間隔も考慮）
        const roundedProgress = Math.round(progress);
        const now = Date.now();

        // 進捗値が変化していて、かつ前回の更新から一定時間経過している場合のみ更新
        if ((roundedProgress > lastSplittingProgress) && (now - lastSplittingUpdate >= splittingDebounceMs)) {
          lastSplittingProgress = roundedProgress;
          lastSplittingUpdate = now;
          
          // ステップの進捗も更新
          this.callbacks.onStepsUpdate(steps => updateStepProgress(steps, 'audioSplitting', roundedProgress));
          this.callbacks.onStateUpdate({ 
            stepProgress: roundedProgress,
            status: this.t('processing.audioSplitting', { progress: roundedProgress.toFixed(1) })
          });
          // 音声分割は全体の20%として計算
          this.callbacks.onProgress(30 + roundedProgress * 0.2);
        }
      }, this.callbacks.onFFmpegLog, duration);

      // チャンク分割完了とチャンクステップ作成
      const fileSizeMB = (wavData.length / (1024 * 1024)).toFixed(2);
      this.callbacks.onStepsUpdate(steps => {
        let updatedSteps;
        if (chunks.length === 1) {
          updatedSteps = updateStepStatus(steps, 'audioSplitting', 'skipped', undefined, this.t('logs.noSplittingNeeded', { fileSize: fileSizeMB }));
        } else {
          updatedSteps = updateStepStatus(steps, 'audioSplitting', 'completed');
        }
        return {
          ...updatedSteps,
          chunks: createChunkSteps(chunks.length)
        };
      });
      
      this.callbacks.onStateUpdate({ totalChunks: chunks.length });
      
      // チャンク数に応じてメッセージを変える
      if (chunks.length === 1) {
        this.callbacks.onLog('success', 'logs.noSplittingNeeded', { fileSize: fileSizeMB });
        this.callbacks.onLog('info', 'logs.singleFileProcessing');
      } else {
        this.callbacks.onLog('success', 'logs.splittingComplete', { chunks: chunks.length });
        this.callbacks.onLog('info', 'logs.chunksInfo', { chunks: chunks.length });
      }

      // チャンクが0個の場合はエラー
      if (chunks.length === 0) {
        throw new Error('logs.audioSplittingFailed');
      }

      // 各チャンクを処理
      this.callbacks.onStateUpdate({
        currentStep: 'processing.startingTranscription',
        status: 'processing.startingTranscription'
      });
      this.callbacks.onLog('info', 'logs.startingTranscription');

      const allSegments = await this.processChunks(
        chunks,
        options,
        apiConfig,
        duration
      );

      // ステップ5: 最終処理開始
      this.callbacks.onStepsUpdate(steps => updateStepStatus(steps, 'finalizing', 'inProgress'));
      this.callbacks.onStepsUpdate(steps => updateStepProgress(steps, 'finalizing', 50));
      
      const processingTime = (Date.now() - startTime) / 1000;
      
      // 最終処理完了
      this.callbacks.onStepsUpdate(steps => updateStepProgress(steps, 'finalizing', 100));
      this.callbacks.onStepsUpdate(steps => updateStepStatus(steps, 'finalizing', 'completed'));
      this.callbacks.onLog('success', 'logs.transcriptionComplete', { 
        time: processingTime.toFixed(2), 
        segments: allSegments.length 
      });

      // 処理完了状態を明示的に設定
      this.callbacks.onStateUpdate({
        isProcessing: false,
        progress: 100,
        currentStep: 'complete',
        stepProgress: 100,
        status: this.t('processing.complete')
      });

      return {
        segments: allSegments,
        processingTime,
        originalFileName: file.name
      };

    } catch (error) {
      // エラー時も処理完了状態を設定
      this.callbacks.onStateUpdate({
        isProcessing: false,
        progress: 0,
        currentStep: 'error',
        stepProgress: 0,
        status: this.t('processing.error')
      });
      this.callbacks.onLog('error', 'errors.processingFailed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private async processChunks(
    chunks: Uint8Array[],
    options: TranscriptionOptions,
    apiConfig: {
      baseUrl: string | undefined;
      token?: string;
      useServerProxy: boolean;
    },
    totalDuration: number
  ): Promise<TranscriptionSegment[]> {
    let allSegments: TranscriptionSegment[] = [];
    let lastEndTime = 0;
    let hasStreamingData = false; // ストリーミングデータを受信したかのフラグ
    const baseProgress = 40; // 前の処理で40%完了
    const transcriptionProgress = 60; // 残り60%を文字起こしに使用

    for (let i = 0; i < chunks.length; i++) {
      // チャンクステップを開始状態に更新
      const chunkStepId = getChunkStepId(i);
      this.callbacks.onStepsUpdate(steps => updateStepStatus(steps, chunkStepId, 'inProgress'));
      
      this.callbacks.onStateUpdate({
        currentChunk: i + 1,
        totalChunks: chunks.length,
        currentStep: 'processing.uploadingChunk',
        status: 'processing.uploadingChunk',
        stepProgress: 0
      });

      // チャンク数に応じてメッセージを変える
      if (chunks.length === 1) {
        this.callbacks.onLog('info', 'logs.uploadingFile');
      } else {
        this.callbacks.onLog('info', 'logs.uploadingChunk', { current: i + 1, total: chunks.length });
      }

      const chunk = chunks[i];
      hasStreamingData = false;

      try {
        this.callbacks.onLog('info', 'logs.sendingToAPI', { endpoint: apiConfig.baseUrl });

        // ストリーミング用のコールバック関数
        const onStreamUpdate = (segments: any[]) => {
          hasStreamingData = true;
          
          // 受信したセグメントを時間オフセット付きで変換
          const currentChunkSegments: TranscriptionSegment[] = segments.map((segment: any, index: number) => ({
            id: allSegments.length + index, // 既存セグメント数を基準にIDを設定
            seek: segment.seek || 0,
            start: (segment.start || 0) + lastEndTime,
            end: (segment.end || 0) + lastEndTime,
            text: segment.text || '',
            tokens: segment.tokens || [],
            temperature: segment.temperature || 0,
            avg_logprob: segment.avg_logprob || 0,
            compression_ratio: segment.compression_ratio || 0,
            no_speech_prob: segment.no_speech_prob || 0,
            words: segment.words || null
          }));

          // 各セグメントを個別にチェックして追加
          for (const newSegment of currentChunkSegments) {
            if (!newSegment.text.trim()) continue; // 空のテキストはスキップ
            
            // より緩い重複チェック（既存のallSegmentsに対してのみ）
            const exists = allSegments.some(existing => 
              Math.abs(existing.start - newSegment.start) < 0.5 && 
              Math.abs(existing.end - newSegment.end) < 0.5 &&
              existing.text.trim() === newSegment.text.trim()
            );
            
            if (!exists) {
              allSegments.push(newSegment);
            }
          }

          // 開始時間でソート
          allSegments.sort((a, b) => a.start - b.start);

          // IDを再採番
          allSegments.forEach((segment, index) => {
            segment.id = index;
          });

          // リアルタイムでセグメントを送信
          this.callbacks.onSegmentsUpdate([...allSegments]);

          // セグメントベースの進捗計算（より安定した計算）
          if (allSegments.length > 0 && totalDuration > 0) {
            const lastSegment = allSegments[allSegments.length - 1];
            const processedDuration = lastSegment.end;
            const currentProgress = Math.min(100, (processedDuration / totalDuration) * 100);
            
            // 文字起こし処理は全体の50%として計算
            const transcriptionBaseProgress = 50; // 前処理で50%完了
            const transcriptionProgress = 50; // 残り50%を文字起こしに使用
            
            // チャンク内での進捗を計算
            const chunkSize = totalDuration / chunks.length;
            const currentChunkStart = i * chunkSize;
            const chunkProgress = Math.min(100, Math.max(0, ((processedDuration - currentChunkStart) / chunkSize) * 100));
            const roundedChunkProgress = Math.round(chunkProgress);
            
            const overallProgress = Math.min(100, transcriptionBaseProgress + (currentProgress / 100) * transcriptionProgress);
            
            // ここにステップの進捗を更新する処理を追加（1%刻みで更新）
            this.callbacks.onStepsUpdate(steps => updateStepProgress(steps, chunkStepId, roundedChunkProgress));
            
            this.callbacks.onProgress(overallProgress);
            this.callbacks.onStateUpdate({
              currentStep: chunks.length === 1 ? 'processing.processingFile' : 'processing.processingChunk',
              stepProgress: chunkProgress,
              status: chunks.length === 1 ? 
                this.t('processing.processingFile', { 
                  processed: processedDuration.toFixed(1),
                  total_duration: totalDuration.toFixed(1),
                  progress: chunkProgress.toFixed(1)
                }) : 
                this.t('processing.processingChunk', {
                  current: i + 1,
                  total: chunks.length,
                  processed: processedDuration.toFixed(1),
                  total_duration: totalDuration.toFixed(1),
                  progress: chunkProgress.toFixed(1)
                })
            });
          } else {
            // セグメントがない場合は時間ベースの推定進捗
            const estimatedProgress = (i / chunks.length) * 100;
            const overallProgress = Math.min(100, 50 + (estimatedProgress / 100) * 50);
            
            // ここにステップの進捗を更新する処理を追加
            this.callbacks.onStepsUpdate(steps => updateStepProgress(steps, chunkStepId, 50));
            
            this.callbacks.onProgress(overallProgress);
            this.callbacks.onStateUpdate({
              currentStep: chunks.length === 1 ? 'processing.processingFile' : 'processing.processingChunk',
              stepProgress: 50, // 処理中は50%として表示
              status: chunks.length === 1 ? 
                this.t('processing.processingFile', { 
                  processed: '0.0',
                  total_duration: totalDuration.toFixed(1),
                  progress: '0.0'
                }) : 
                this.t('processing.processingChunk', {
                  current: i + 1,
                  total: chunks.length,
                  processed: '0.0',
                  total_duration: totalDuration.toFixed(1),
                  progress: '0.0'
                })
            });
          }
        };

        // APIベースURLが設定されていない場合はエラー
        if (!apiConfig.baseUrl) {
          throw new Error('API base URL is not configured');
        }

        // ブラウザ拡張機能のエラーを無視するためのラッパー
        const transcribeWithRetry = async (retryCount = 0): Promise<any> => {
          try {
            return await transcribeAudioChunk(
              apiConfig.baseUrl as string,
              chunk,
              i,
              options,
              apiConfig.token,
              onStreamUpdate
            );
          } catch (error) {
            // ブラウザ拡張機能のエラーを検出
            if (error instanceof Error && 
                (error.message.includes('message channel closed') ||
                 error.message.includes('listener indicated an asynchronous response'))) {
              if (retryCount < 2) {
                this.callbacks.onLog('info', 'logs.browserExtensionRetry', { attempt: retryCount + 1, total: 3 });
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
                return transcribeWithRetry(retryCount + 1);
              } else {
                this.callbacks.onLog('error', 'errors.browserExtensionError');
              }
            }
            throw error;
          }
        };

        const result = await transcribeWithRetry();

        // チャンク数に応じてメッセージを変える
        if (chunks.length === 1) {
          this.callbacks.onLog('success', 'logs.fileProcessed');
        } else {
          this.callbacks.onLog('success', 'logs.chunkProcessed', { current: i + 1, total: chunks.length });
        }

        // ストリーミングでデータが処理されていない場合のみフォールバック処理
        if (!hasStreamingData) {
          let newSegments: TranscriptionSegment[] = [];
          
          if (options.responseFormat === 'vtt') {
            // VTT形式の場合、パースしてセグメントに変換
            const vttText = typeof result === 'string' ? result : (result.text || '');
            newSegments = this.parseVTTResponse(vttText, lastEndTime);
          } else if (typeof result === 'string') {
            // SRTやその他のテキスト形式の場合
            newSegments = this.parseVTTResponse(result, lastEndTime);
          } else if (result.segments && Array.isArray(result.segments)) {
            // JSON形式でセグメントがある場合
            newSegments = result.segments.map((segment: any) => ({
              id: segment.id || 0,
              seek: segment.seek || 0,
              start: (segment.start || 0) + lastEndTime,
              end: (segment.end || 0) + lastEndTime,
              text: segment.text || '',
              tokens: segment.tokens || [],
              temperature: segment.temperature || 0,
              avg_logprob: segment.avg_logprob || 0,
              compression_ratio: segment.compression_ratio || 0,
              no_speech_prob: segment.no_speech_prob || 0,
              words: segment.words || null
            }));
          } else if (result.text) {
            // テキストのみの場合、時間情報なしでセグメントを作成
            const chunkDuration = totalDuration / chunks.length;
            const startTime = lastEndTime;
            const endTime = startTime + chunkDuration;
            
            newSegments = [{
              id: allSegments.length,
              seek: 0,
              start: startTime,
              end: endTime,
              text: result.text,
              tokens: [],
              temperature: 0,
              avg_logprob: 0,
              compression_ratio: 0,
              no_speech_prob: 0,
              words: null
            }];
          }

          if (newSegments.length > 0) {
            // 重複チェック（緩い重複チェック）
            const filteredSegments = newSegments.filter(newSeg => 
              !allSegments.some(existing => 
                Math.abs(existing.start - newSeg.start) < 0.1 && 
                Math.abs(existing.end - newSeg.end) < 0.1
              )
            );

            if (filteredSegments.length > 0) {
              allSegments = [...allSegments, ...filteredSegments];
              // lastEndTimeを更新
              const sortedSegments = allSegments.sort((a, b) => a.start - b.start);
              if (sortedSegments.length > 0) {
                lastEndTime = sortedSegments[sortedSegments.length - 1].end;
              }

              // リアルタイムでセグメントを送信
              this.callbacks.onSegmentsUpdate([...allSegments]);
            }
          }
        } else {
          // ストリーミングデータがある場合はlastEndTimeを更新
          if (allSegments.length > 0) {
            const sortedSegments = allSegments.sort((a, b) => a.start - b.start);
            lastEndTime = sortedSegments[sortedSegments.length - 1].end;
          }
        }

        // チャンクベースの進捗を計算（完了したチャンク数ベース）
        const completedChunks = i + 1; // 現在のチャンクが完了
        const chunkProgress = (completedChunks / chunks.length) * 100;
        const minChunkProgress = baseProgress + (chunkProgress / 100) * transcriptionProgress;
        
        // チャンクステップを完了状態に更新
        this.callbacks.onStepsUpdate(steps => updateStepStatus(steps, chunkStepId, 'completed'));
        
        // 現在の進捗と比較して確実に進捗させる
        this.callbacks.onProgress(Math.min(100, minChunkProgress));
        
        // チャンク完了のステップ更新
        const completionPercentage = (completedChunks / chunks.length) * 100;
        this.callbacks.onStateUpdate({
          currentStep: chunks.length === 1 ? 'processing.complete' : 'processing.processingChunk',
          stepProgress: completionPercentage, // チャンク完了率
          status: chunks.length === 1 ? 
            this.t('processing.complete') : 
            this.t('logs.chunkProcessed', { current: completedChunks, total: chunks.length })
        });

      } catch (error) {
        // チャンクステップをエラー状態に更新
        this.callbacks.onStepsUpdate(steps => updateStepStatus(steps, chunkStepId, 'error', 
          error instanceof Error ? error.message : String(error)));
        this.callbacks.onLog('error', 'errors.chunkProcessingFailed', { 
          chunk: i + 1, 
          error: error instanceof Error ? error.message : String(error) 
        });
        // エラーが発生してもスキップして続行
        continue;
      }
    }

    return allSegments;
  }

  private parseVTTResponse(vttText: string, timeOffset: number): TranscriptionSegment[] {
    const segments: TranscriptionSegment[] = [];
    const lines = vttText.split('\n');
    let currentSegment: Partial<TranscriptionSegment> = {};
    let segmentId = 0;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // SSE形式のdata:プレフィックスを除去
      if (line.startsWith('data: ')) {
        line = line.substring(6); // "data: "を除去
      }
      
      // タイムスタンプ行を検出
      if (line.includes('-->')) {
        const [startTime, endTime] = line.split('-->').map(t => t.trim());
        const parsedStart = this.parseVTTTime(startTime);
        const parsedEnd = this.parseVTTTime(endTime);
        
        // 有効な時間値のみを受け入れる
        if (!isNaN(parsedStart) && !isNaN(parsedEnd) && parsedStart >= 0 && parsedEnd >= 0 && parsedEnd > parsedStart) {
          currentSegment.id = segmentId++;
          currentSegment.seek = 0;
          currentSegment.start = parsedStart + timeOffset;
          currentSegment.end = parsedEnd + timeOffset;
          currentSegment.tokens = [];
          currentSegment.temperature = 0;
          currentSegment.avg_logprob = 0;
          currentSegment.compression_ratio = 0;
          currentSegment.no_speech_prob = 0;
          currentSegment.words = null;
        } else {
          // 無効な時間値の場合は現在のセグメントをリセット
          currentSegment = {};
        }
      } else if (line && !line.startsWith('WEBVTT') && !line.startsWith('NOTE') && currentSegment.start !== undefined) {
        // テキスト行（有効なセグメントの場合のみ）
        // 前の行で設定されたタイムスタンプがある場合のみテキストを追加
        if (currentSegment.text) {
          // 既にテキストがある場合は改行で連結
          currentSegment.text += '\n' + line;
        } else {
          currentSegment.text = line;
        }
        
        // 次の行をチェックして、新しいタイムスタンプまたは空行の場合はセグメントを完了
        let shouldCompleteSegment = false;
        if (i + 1 >= lines.length) {
          // ファイル終端
          shouldCompleteSegment = true;
        } else {
          const nextLine = lines[i + 1].trim();
          const nextLineClean = nextLine.startsWith('data: ') ? nextLine.substring(6) : nextLine;
          if (!nextLine || nextLineClean.includes('-->')) {
            shouldCompleteSegment = true;
          }
        }
        
        if (shouldCompleteSegment) {
          segments.push({ ...currentSegment } as TranscriptionSegment); // オブジェクトのコピーを作成
          currentSegment = {};
        }
      }
    }

    // 重複セグメントを削除（緩い重複チェック）
    const uniqueSegments = segments.filter((segment, index, self) => 
      index === self.findIndex(s => 
        Math.abs(s.start - segment.start) < 0.1 && 
        Math.abs(s.end - segment.end) < 0.1
      )
    );

    return uniqueSegments;
  }

  private parseVTTTime(timeStr: string): number {
    if (!timeStr || typeof timeStr !== 'string') {
      return NaN;
    }

    const cleanTimeStr = timeStr.trim();
    const parts = cleanTimeStr.split(':');
    
    try {
      if (parts.length === 3) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const seconds = parseFloat(parts[2]);
        
        if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || 
            hours < 0 || minutes < 0 || seconds < 0 || 
            minutes >= 60 || seconds >= 60) {
          return NaN;
        }
        
        return hours * 3600 + minutes * 60 + seconds;
      } else if (parts.length === 2) {
        const minutes = parseInt(parts[0], 10);
        const seconds = parseFloat(parts[1]);
        
        if (isNaN(minutes) || isNaN(seconds) || 
            minutes < 0 || seconds < 0 || seconds >= 60) {
          return NaN;
        }
        
        return minutes * 60 + seconds;
      } else if (parts.length === 1) {
        const seconds = parseFloat(parts[0]);
        
        if (isNaN(seconds) || seconds < 0) {
          return NaN;
        }
        
        return seconds;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      console.warn('Error parsing VTT time:', timeStr, error);
    }
      return NaN;
    }
    
    return NaN;
  }
}