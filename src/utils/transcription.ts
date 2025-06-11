import { TranscriptionSegment } from '../types';

export const parseResponse = (response: any): TranscriptionSegment[] => {
  // レスポンスが文字列の場合（text, srt, vtt形式）
  if (typeof response === 'string') {
    const lines = response.split('\n');
    const segments: TranscriptionSegment[] = [];
    let currentSegment: Partial<TranscriptionSegment> | null = null;

    for (const line of lines) {
      // data: プレフィックスを削除
      const cleanLine = line.replace(/^data: /, '').trim();
      if (!cleanLine || cleanLine === 'WEBVTT') continue;

      // タイムスタンプ行の処理
      const timestampMatch = cleanLine.match(/(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (timestampMatch) {
        if (currentSegment && currentSegment.text) {
          segments.push(currentSegment as TranscriptionSegment);
        }
        const [, start, end] = timestampMatch;
        currentSegment = {
          id: segments.length,
          seek: 0,
          start: timeToSeconds(start),
          end: timeToSeconds(end),
          text: '',
          tokens: [],
          temperature: 0,
          avg_logprob: 0,
          compression_ratio: 0,
          no_speech_prob: 0,
          words: null
        };
        continue;
      }

      // テキスト行の処理
      if (currentSegment && cleanLine) {
        currentSegment.text = (currentSegment.text || '') + cleanLine;
      }
    }

    // 最後のセグメントを追加
    if (currentSegment && currentSegment.text) {
      segments.push(currentSegment as TranscriptionSegment);
    }

    return segments;
  }

  // verbose_json形式の場合
  if (response.segments) {
    return response.segments;
  }

  // json形式の場合
  if (response.text) {
    return [{
      id: 0,
      seek: 0,
      start: 0,
      end: 0,
      text: response.text,
      tokens: [],
      temperature: 0,
      avg_logprob: 0,
      compression_ratio: 0,
      no_speech_prob: 0,
      words: null
    }];
  }

  // 想定外の形式の場合
  console.error('Unexpected response format:', response);
  return [];
};

const timeToSeconds = (timeStr: string): number => {
  const [time, ms] = timeStr.split('.');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + (ms ? parseInt(ms) / 1000 : 0);
};

export const downloadTranscription = (transcription: TranscriptionSegment[], format: 'vtt' | 'srt' | 'json' | 'text', fileName: string) => {
  let content = '';
  let extension = '';

  switch (format) {
    case 'vtt':
      content = 'WEBVTT\n\n';
      transcription.forEach(segment => {
        content += `${formatTime(segment.start)} --> ${formatTime(segment.end)}\n${segment.text}\n\n`;
      });
      extension = 'vtt';
      break;
    case 'srt':
      transcription.forEach((segment, index) => {
        content += `${index + 1}\n${formatTime(segment.start, 'srt')} --> ${formatTime(segment.end, 'srt')}\n${segment.text}\n\n`;
      });
      extension = 'srt';
      break;
    case 'json':
      content = JSON.stringify(transcription, null, 2);
      extension = 'json';
      break;
    case 'text':
      content = transcription.map(segment => segment.text).join('\n');
      extension = 'txt';
      break;
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.${extension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const formatTime = (seconds: number, format: 'vtt' | 'srt' = 'vtt'): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  if (format === 'srt') {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}; 