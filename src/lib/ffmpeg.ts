import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// グローバルなFFmpegインスタンスと初期化状態を管理
let globalFFmpegInstance: FFmpeg | null = null;
let isInitializing = false;
let isInitialized = false;
let initializationPromise: Promise<FFmpeg> | null = null;

// ログハンドラーを管理するためのMap
const logHandlers = new Map<FFmpeg, (event: { message: string }) => void>();

// ログハンドラーを設定する関数
const setupLogHandler = (ffmpeg: FFmpeg, onLog?: (message: string) => void) => {
  // 既存のログハンドラーを削除
  const existingHandler = logHandlers.get(ffmpeg);
  if (existingHandler) {
    ffmpeg.off('log', existingHandler);
    logHandlers.delete(ffmpeg);
  }

  if (onLog) {
    const handler = (event: { message: string }) => {
      onLog(event.message);
    };
    ffmpeg.on('log', handler);
    logHandlers.set(ffmpeg, handler);
  }
};

// ログハンドラーを削除する関数
const removeLogHandler = (ffmpeg: FFmpeg) => {
  const existingHandler = logHandlers.get(ffmpeg);
  if (existingHandler) {
    ffmpeg.off('log', existingHandler);
    logHandlers.delete(ffmpeg);
  }
};

/**
 * FFmpegの事前初期化を行う
 * ページ読み込み時に呼び出して、後の処理を高速化する
 */
export const preInitializeFFmpeg = async (
  onLog?: (message: string) => void,
  onProgress?: (message: string) => void
): Promise<FFmpeg> => {
  // 既に初期化済みの場合はそのインスタンスを返す
  if (isInitialized && globalFFmpegInstance) {
    // 既存のインスタンスに対して、新しいログハンドラーを設定
    if (onLog) {
      setupLogHandler(globalFFmpegInstance, onLog);
    }
    return globalFFmpegInstance;
  }

  // 初期化中の場合は既存のPromiseを返す
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  // 新規初期化を開始
  isInitializing = true;
  initializationPromise = (async () => {
    try {
      if (onProgress) {
        onProgress('FFmpegの初期化を開始しています...');
      }

      const ffmpeg = new FFmpeg();
      
      // ログハンドラーを設定
      if (onLog) {
        setupLogHandler(ffmpeg, onLog);
      }

      await ffmpeg.load();
      
      globalFFmpegInstance = ffmpeg;
      isInitialized = true;
      isInitializing = false;

      if (onProgress) {
        onProgress('FFmpegの初期化が完了しました');
      }

      return ffmpeg;
    } catch (error) {
      isInitializing = false;
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
};

/**
 * 既に初期化済みのFFmpegインスタンスを取得する
 * 初期化されていない場合は新しいインスタンスを作成し、その場でロードする
 */
export const getFFmpegInstance = async (): Promise<FFmpeg> => {
  if (isInitialized && globalFFmpegInstance) {
    return globalFFmpegInstance;
  }
  
  // 初期化されていない場合は新しいインスタンスを作成してロード
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();
  return ffmpeg;
};

/**
 * 同期的にFFmpegインスタンスを取得する（事前初期化が完了している場合のみ）
 * 事前初期化が完了していない場合は新しいインスタンスを返す（ロードは別途必要）
 */
export const getFFmpegInstanceSync = (): FFmpeg => {
  if (isInitialized && globalFFmpegInstance) {
    return globalFFmpegInstance;
  }
  
  // 初期化されていない場合は新しいインスタンスを作成
  return new FFmpeg();
};

/**
 * FFmpegの初期化状態を取得する
 */
export const getFFmpegInitializationStatus = () => {
  return {
    isInitialized,
    isInitializing
  };
};

export const convertToWav = async (
  file: File,
  ffmpeg: FFmpeg,
  onProgress?: (progress: number) => void,
  onLog?: (message: string) => void
): Promise<{ data: Uint8Array; duration: number }> => {
  try {
    let duration = 0;
    let durationFound = false;
    let lastProgressValue = 0;

    // ログハンドラーを設定（ログからtime値を抽出して進捗を計算）
    // 更新頻度を制御するためのデバウンス用変数
    let lastUpdateTime = 0;
    const updateThreshold = 1000; // 1秒間隔でデバウンス

    const logHandler = (event: { message: string }) => {
      const message = event.message;
      
      // Durationの抽出
      if (!durationFound) {
        const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (durationMatch) {
          const [, hours, minutes, seconds, centiseconds] = durationMatch.map(Number);
          duration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
          durationFound = true;
        }
      }

      // 進捗の抽出（time=XX:XX:XX.XX形式）
      if (durationFound && duration > 0 && onProgress) {
        const timeMatch = message.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (timeMatch) {
          const [, hours, minutes, seconds, centiseconds] = timeMatch.map(Number);
          const currentTime = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
          const progressPercent = Math.min(100, Math.round((currentTime / duration) * 100));
          
          // 1%刻みで進捗を更新し、かつ更新頻度も制限する
          const now = Date.now();
          if (progressPercent > lastProgressValue && (now - lastUpdateTime) >= updateThreshold) {
            lastProgressValue = progressPercent;
            lastUpdateTime = now;
            onProgress(progressPercent);
          }
        }
      }
      
      // ログを呼び出し元に転送
      if (onLog) {
        onLog(message);
      }
    };
    
    // 一時的にログハンドラーを設定
    ffmpeg.on('log', logHandler);

    const inputFileName = 'input.' + file.name.split('.').pop();
    const outputFileName = 'output.wav';
    
    // 入力ファイルを書き込み
    await ffmpeg.writeFile(inputFileName, await fetchFile(file));

    // まず、ファイルの長さを取得するためのプリスキャン
    try {
      await ffmpeg.exec(['-i', inputFileName]);
    } catch (error) {
      // FFmpegは正常に実行されてもエラーを投げることがあるので無視
    }

    // WAVに変換（16kHz, mono, 16-bit）
    await ffmpeg.exec([
      '-i', inputFileName,
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      '-f', 'wav',
      outputFileName
    ]);
    
    // 出力ファイルを読み取り
    const data = await ffmpeg.readFile(outputFileName) as Uint8Array;
    
    // ArrayBufferの切り離し問題を回避するため、データのコピーを作成
    const dataCopy = new Uint8Array(data.length);
    dataCopy.set(data);
    
    // クリーンアップ
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);
    
    // ログハンドラーを削除
    ffmpeg.off('log', logHandler);

    // 音声の長さが取得できない場合はWAVヘッダーから計算
    if (!durationFound) {
      const sampleRate = 16000;
      const bytesPerSample = 2;
      const channels = 1;
      const headerSize = 44;
      if (dataCopy.length > headerSize) {
        const audioDataSize = dataCopy.length - headerSize;
        const totalSamples = audioDataSize / (bytesPerSample * channels);
        duration = totalSamples / sampleRate;
      }
    }
    
    return { data: dataCopy, duration };
  } catch (error) {
    throw new Error(`FFmpeg conversion failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const splitIntoChunks = async (
  wavData: Uint8Array,
  ffmpeg: FFmpeg,
  onProgress?: (progress: number) => void,
  onLog?: (message: string) => void,
  duration?: number
): Promise<Uint8Array[]> => {
  try {
    // ログハンドラーを設定
    setupLogHandler(ffmpeg, onLog);

    // ファイルサイズが100MB以内の場合は分割せずにそのまま返す
    const maxFileSizeBytes = 100 * 1024 * 1024; // 100MB
    if (wavData.length <= maxFileSizeBytes) {
      if (onProgress) {
        onProgress(100);
      }
      // ログハンドラーが必要なくなったので削除
      removeLogHandler(ffmpeg);
      return [wavData];
    }

    // 100MBを超える場合、約100MBずつにファイルサイズベースで分割
    const chunks: Uint8Array[] = [];
    const inputFileName = 'input_for_splitting.wav';
    
    // 必要なチャンク数を計算（100MBずつ）
    const numChunks = Math.ceil(wavData.length / maxFileSizeBytes);
    const targetDurationPerChunk = (duration || 0) / numChunks;
    
    // ArrayBufferの切り離し問題を回避するため、データのコピーを作成
    const wavDataCopy = new Uint8Array(wavData.length);
    wavDataCopy.set(wavData);
    
    // 入力ファイルを書き込み
    await ffmpeg.writeFile(inputFileName, wavDataCopy);
    
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * targetDurationPerChunk;
      const outputFileName = `chunk_${i}.wav`;
      
      // FFmpegで時間ベースの分割を実行
      await ffmpeg.exec([
        '-i', inputFileName,
        '-ss', startTime.toString(),
        '-t', targetDurationPerChunk.toString(),
        '-ar', '16000',
        '-ac', '1',
        '-c:a', 'pcm_s16le',
        outputFileName
      ]);
      
      // 分割されたチャンクを読み取り
      const chunkData = await ffmpeg.readFile(outputFileName);
      const chunkArray = new Uint8Array(chunkData as ArrayBuffer);
      
      // ArrayBufferの切り離し問題を回避するため、データのコピーを作成
      const chunkCopy = new Uint8Array(chunkArray.length);
      chunkCopy.set(chunkArray);
      
      chunks.push(chunkCopy);
      
      // 進捗を更新
      if (onProgress) {
        onProgress(Math.round(((i + 1) / numChunks) * 100));
      }
      
      // 一時ファイルを削除
      try {
        await ffmpeg.deleteFile(outputFileName);
      } catch (error) {
        // ファイル削除エラーは無視
      }
    }
    
    // 入力ファイルを削除
    try {
      await ffmpeg.deleteFile(inputFileName);
    } catch (error) {
      // ファイル削除エラーは無視
    }
    
    // 最低でも1つのチャンクは返す
    if (chunks.length === 0) {
      chunks.push(wavData);
    }

    // ログハンドラーを削除
    removeLogHandler(ffmpeg);
    
    return chunks;
  } catch (error) {
    // エラー時もログハンドラーを削除
    removeLogHandler(ffmpeg);
    throw new Error(`Chunk splitting failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const getAudioDuration = async (
  wavData: Uint8Array,
  ffmpeg: FFmpeg,
  onLog?: (message: string) => void
): Promise<number> => {
  try {
    let duration = 0;
    let logMessages: string[] = [];

    // 専用のログハンドラーを作成
    const logHandler = (message: string) => {
      logMessages.push(message);
      if (onLog) {
        onLog(message);
      }
    };

    // ログハンドラーを設定
    setupLogHandler(ffmpeg, logHandler);

    const inputFileName = 'duration_check.wav';
    
    // ArrayBufferの切り離し問題を回避するため、データのコピーを作成
    const wavDataCopy = new Uint8Array(wavData.length);
    wavDataCopy.set(wavData);
    
    await ffmpeg.writeFile(inputFileName, wavDataCopy);

    try {
      // ffprobeのような情報取得コマンドを実行
      await ffmpeg.exec([
        '-i', inputFileName,
        '-f', 'null',
        '-'
      ]);
    } catch (error) {
      // FFmpegは正常に実行されてもエラーを投げることがあるので、ログから情報を抽出
    }

    // ログからDurationを抽出
    for (const message of logMessages) {
      const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1]);
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseInt(durationMatch[3]);
        const centiseconds = parseInt(durationMatch[4]);
        duration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
        break;
      }
    }

    // ログから取得できない場合は、WAVファイルのヘッダーから計算
    if (duration === 0) {
      const sampleRate = 16000;
      const bytesPerSample = 2;
      const channels = 1;
      const headerSize = 44; // WAVヘッダーサイズ
      
      if (wavData.length > headerSize) {
        const audioDataSize = wavData.length - headerSize;
        const totalSamples = audioDataSize / (bytesPerSample * channels);
        duration = totalSamples / sampleRate;
      }
    }
    
    // ログハンドラーを削除
    removeLogHandler(ffmpeg);
    
    return Math.max(duration, 0); // 負の値を防ぐ
  } catch (error) {
    // エラー時もログハンドラーを削除
    removeLogHandler(ffmpeg);
    throw new Error(`Duration calculation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * FFmpegインスタンスがロード済みかどうかをチェックする
 */
export const isFFmpegLoaded = (ffmpeg: FFmpeg): boolean => {
  return ffmpeg.loaded;
};

/**
 * FFmpegインスタンスが使用可能な状態にする
 * 必要に応じてロードを行う
 */
export const ensureFFmpegLoaded = async (ffmpeg: FFmpeg): Promise<void> => {
  if (!ffmpeg.loaded) {
    await ffmpeg.load();
  }
};