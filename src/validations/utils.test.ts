import { describe, test, expect } from 'vitest';
import { formatTime } from '../services/transcriptionUtils';

/**
 * 時間フォーマットのテスト
 */
describe('Time Formatting Utils', () => {
  // formatTime関数のテスト（実際の関数を使用）

  test('正しい時間フォーマット - 0秒', () => {
    expect(formatTime(0)).toBe('00:00:00.000');
  });

  test('正しい時間フォーマット - 1分30秒', () => {
    expect(formatTime(90)).toBe('00:01:30.000');
  });

  test('正しい時間フォーマット - 1時間5分30.5秒', () => {
    expect(formatTime(3930.5)).toBe('01:05:30.500');
  });

  test('正しい時間フォーマット - ミリ秒を含む', () => {
    expect(formatTime(123.456)).toBe('00:02:03.456');
  });
});

/**
 * ファイル名生成のテスト
 */
describe('Filename Generation Utils', () => {
  const getBaseFileName = (originalFileName: string): string => {
    return originalFileName.replace(/\.[^/.]+$/, '');
  };

  test('拡張子を正しく除去', () => {
    expect(getBaseFileName('audio.mp3')).toBe('audio');
    expect(getBaseFileName('recording.wav')).toBe('recording');
    expect(getBaseFileName('podcast.m4a')).toBe('podcast');
  });

  test('複数の拡張子を持つファイル名', () => {
    expect(getBaseFileName('backup.audio.mp3')).toBe('backup.audio');
  });

  test('拡張子がないファイル名', () => {
    expect(getBaseFileName('noextension')).toBe('noextension');
  });

  test('空文字列の処理', () => {
    expect(getBaseFileName('')).toBe('');
  });
});

/**
 * バリデーション関数のテスト
 */
describe('Validation Utils', () => {
  const validateAudioFile = (file: File): boolean => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'video/mp4'];
    return allowedTypes.includes(file.type) || /\.(mp3|wav|m4a|mp4)$/i.test(file.name);
  };

  const validateTemperature = (temperature: number): boolean => {
    return temperature >= 0 && temperature <= 1;
  };

  test('音声ファイルのバリデーション - 有効なファイル', () => {
    const mp3File = new File([''], 'test.mp3', { type: 'audio/mpeg' });
    const wavFile = new File([''], 'test.wav', { type: 'audio/wav' });
    
    expect(validateAudioFile(mp3File)).toBe(true);
    expect(validateAudioFile(wavFile)).toBe(true);
  });

  test('音声ファイルのバリデーション - 無効なファイル', () => {
    const txtFile = new File([''], 'test.txt', { type: 'text/plain' });
    const imgFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    
    expect(validateAudioFile(txtFile)).toBe(false);
    expect(validateAudioFile(imgFile)).toBe(false);
  });

  test('温度パラメータのバリデーション', () => {
    expect(validateTemperature(0)).toBe(true);
    expect(validateTemperature(0.5)).toBe(true);
    expect(validateTemperature(1)).toBe(true);
    expect(validateTemperature(-0.1)).toBe(false);
    expect(validateTemperature(1.1)).toBe(false);
  });
});

/**
 * データ変換のテスト
 */
describe('Data Conversion Utils', () => {
  interface TranscriptionSegment {
    start: number;
    end: number;
    text: string;
  }

  const generateVTT = (segments: TranscriptionSegment[]): string => {
    let vtt = 'WEBVTT\n\n';
    segments.forEach((segment, index) => {
      vtt += `${index + 1}\n`;
      vtt += `${formatTime(segment.start)} --> ${formatTime(segment.end)}\n`;
      vtt += `${segment.text}\n\n`;
    });
    return vtt;
  };

  test('VTTファイル生成', () => {
    const segments: TranscriptionSegment[] = [
      { start: 0, end: 5, text: 'Hello world' },
      { start: 5, end: 10, text: 'This is a test' }
    ];

    const result = generateVTT(segments);
    
    expect(result).toContain('WEBVTT');
    expect(result).toContain('Hello world');
    expect(result).toContain('This is a test');
    expect(result).toContain('00:00:00.000 --> 00:00:05.000');
    expect(result).toContain('00:00:05.000 --> 00:00:10.000');
  });

  test('空のセグメントでVTTファイル生成', () => {
    const result = generateVTT([]);
    expect(result).toBe('WEBVTT\n\n');
  });
});
