import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// APIモックの設定
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Whisper API Tests', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('API Status Check', () => {
    test('APIステータスチェック - 成功', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ready', version: '1.0.0' }),
      });

      const checkApiStatus = async (): Promise<{ status: string; version?: string }> => {
        const response = await fetch('/api/status');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      };

      const result = await checkApiStatus();
      expect(result.status).toBe('ready');
      expect(result.version).toBe('1.0.0');
      expect(mockFetch).toHaveBeenCalledWith('/api/status');
    });

    test('APIステータスチェック - エラー', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const checkApiStatus = async (): Promise<{ status: string }> => {
        const response = await fetch('/api/status');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      };

      await expect(checkApiStatus()).rejects.toThrow('HTTP 500');
    });
  });

  describe('Transcription Request', () => {
    test('文字起こしリクエスト - 基本パラメータ', async () => {
      const mockResponse = {
        segments: [
          { start: 0, end: 5, text: 'Hello world' }
        ],
        language: 'en'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const transcribeAudio = async (formData: FormData) => {
        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        return response.json();
      };

      const formData = new FormData();
      formData.append('audio', new Blob(['fake audio data']), 'test.mp3');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const result = await transcribeAudio(formData);
      
      expect(result.segments).toHaveLength(1);
      expect(result.segments[0].text).toBe('Hello world');
      expect(result.language).toBe('en');
    });

    test('文字起こしリクエスト - 高度なパラメータ', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ segments: [], language: 'ja' }),
      });

      const transcribeWithAdvancedOptions = async (
        audioBlob: Blob,
        options: {
          model: string;
          language?: string;
          temperature?: number;
          prompt?: string;
          vadFilter?: boolean;
          timestampGranularity?: string;
        }
      ) => {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.mp3');
        formData.append('model', options.model);
        
        if (options.language) formData.append('language', options.language);
        if (options.temperature !== undefined) formData.append('temperature', options.temperature.toString());
        if (options.prompt) formData.append('prompt', options.prompt);
        if (options.vadFilter !== undefined) formData.append('vad_filter', options.vadFilter.toString());
        if (options.timestampGranularity) formData.append('timestamp_granularity', options.timestampGranularity);

        const response = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        return response.json();
      };

      const audioBlob = new Blob(['fake audio'], { type: 'audio/mp3' });
      await transcribeWithAdvancedOptions(audioBlob, {
        model: 'whisper-1',
        language: 'ja',
        temperature: 0.3,
        prompt: '専門用語を正確に認識してください',
        vadFilter: true,
        timestampGranularity: 'word'
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/transcribe', {
        method: 'POST',
        body: expect.any(FormData),
      });
    });
  });

  describe('File Upload Validation', () => {
    test('サポートされているファイル形式', () => {
      const supportedFormats = ['mp3', 'wav', 'm4a', 'mp4'];
      
      const isValidAudioFile = (filename: string): boolean => {
        const extension = filename.split('.').pop()?.toLowerCase();
        return supportedFormats.includes(extension || '');
      };

      expect(isValidAudioFile('audio.mp3')).toBe(true);
      expect(isValidAudioFile('recording.wav')).toBe(true);
      expect(isValidAudioFile('podcast.m4a')).toBe(true);
      expect(isValidAudioFile('video.mp4')).toBe(true);
      expect(isValidAudioFile('document.pdf')).toBe(false);
      expect(isValidAudioFile('image.jpg')).toBe(false);
    });

    test('ファイルサイズ制限', () => {
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

      const isValidFileSize = (fileSize: number): boolean => {
        return fileSize <= MAX_FILE_SIZE;
      };

      expect(isValidFileSize(50 * 1024 * 1024)).toBe(true); // 50MB
      expect(isValidFileSize(100 * 1024 * 1024)).toBe(true); // 100MB
      expect(isValidFileSize(150 * 1024 * 1024)).toBe(false); // 150MB
    });
  });

  describe('Error Handling', () => {
    test('ネットワークエラーの処理', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const apiCall = async () => {
        try {
          const response = await fetch('/api/status');
          return response.json();
        } catch (error) {
          throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      await expect(apiCall()).rejects.toThrow('Network error: Network error');
    });

    test('HTTPステータスエラーの処理', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Endpoint not found' }),
      });

      const apiCallWithErrorHandling = async () => {
        const response = await fetch('/api/nonexistent');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`HTTP ${response.status}: ${errorData.error}`);
        }
        
        return response.json();
      };

      await expect(apiCallWithErrorHandling()).rejects.toThrow('HTTP 404: Endpoint not found');
    });
  });
});
