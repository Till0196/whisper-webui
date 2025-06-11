import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { CHUNK_SIZE, PROGRESS_UPDATE_INTERVAL } from '../constants';
import { LogEntry } from '../types';

export const convertToWav = async (
  file: File,
  ffmpeg: FFmpeg,
  onProgress: (progress: number, remainingTime?: number) => void,
  onLog: (log: LogEntry) => void
): Promise<Uint8Array> => {
  try {
    const inputFileName = 'input.' + file.name.split('.').pop();
    const outputFileName = 'output.wav';

    await ffmpeg.writeFile(inputFileName, await fetchFile(file));

    const command = [
      '-i', inputFileName,
      '-acodec', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      outputFileName
    ];

    let totalDuration = 0;
    let lastTime = Date.now();
    let startTime = Date.now();
    let hasError = false;
    let isProcessing = false;

    // 新しいイベントリスナーを登録
    const logHandler = ({ message }: { message: string }) => {
      if (isProcessing) return; // 既に処理中の場合は無視
      isProcessing = true;

      onLog({ type: 'info', message });

      // エラーメッセージの検出
      if (message.includes('Error') || message.includes('error') || message.includes('Invalid')) {
        hasError = true;
        onLog({ type: 'error', message });
      }

      // 総再生時間の取得
      if (message.includes('Duration:')) {
        const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (durationMatch) {
          const [, hours, minutes, seconds, centiseconds] = durationMatch.map(Number);
          totalDuration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
          startTime = Date.now();
          // デバッグ情報をログに追加
          onLog({ 
            type: 'debug', 
            message: `総再生時間更新:
              時間: ${totalDuration.toFixed(1)}秒
              ログ: ${message}
              開始時間: ${startTime}`
          });
        }
      }

      // 現在の処理時間の取得と進捗計算
      if (message.includes('time=')) {
        const timeMatch = message.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
        if (timeMatch && totalDuration > 0) {
          const [, hours, minutes, seconds, centiseconds] = timeMatch.map(Number);
          const currentTime = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
          
          const now = Date.now();
          if (now - lastTime >= PROGRESS_UPDATE_INTERVAL) {
            // 進捗が0より大きい場合のみ更新
            if (currentTime > 0) {
              const progress = Math.min(100, (currentTime / totalDuration) * 100);
              onProgress(progress);
              lastTime = now;
              // デバッグ情報をログに追加
              onLog({ 
                type: 'debug', 
                message: `FFmpeg進捗:
                  現在の時間: ${currentTime.toFixed(1)}秒
                  総再生時間: ${totalDuration.toFixed(1)}秒
                  進捗: ${progress.toFixed(1)}%
                  ログ: ${message}`
              });
            }
          }
        }
      }

      isProcessing = false;
    };

    ffmpeg.on('log', logHandler);

    await ffmpeg.exec(command);

    // エラーチェック
    if (hasError) {
      throw new Error('音声ファイルの変換に失敗しました。サポートされていない形式か、破損している可能性があります。');
    }

    // 出力ファイルの存在確認
    try {
      const data = await ffmpeg.readFile(outputFileName) as Uint8Array;
      if (data.length === 0) {
        throw new Error('変換後のファイルが空です。');
      }
      return data;
    } catch (error) {
      throw new Error('変換後のファイルの読み込みに失敗しました。');
    }
  } catch (error) {
    onLog({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error occurred' });
    throw error;
  }
};

export const splitIntoChunks = (data: Uint8Array): Uint8Array[] => {
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    chunks.push(data.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
};

export const getAudioDuration = async (audioData: Uint8Array): Promise<number> => {
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();

  const inputFileName = 'input.wav';
  await ffmpeg.writeFile(inputFileName, audioData);

  // FFprobeを使用して音声の長さを取得
  await ffmpeg.exec([
    '-i', inputFileName,
    '-f', 'null',
    '-'
  ]);

  // 出力から長さを抽出
  const output = await ffmpeg.readFile(inputFileName);
  let text = '';
  if (output instanceof Uint8Array) {
    text = new TextDecoder().decode(output);
  }
  const durationMatch = text.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
  
  if (durationMatch) {
    const [, hours, minutes, seconds, centiseconds] = durationMatch.map(Number);
    return hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
  }

  return 0;
}; 