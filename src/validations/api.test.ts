import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transcribeAudio, checkApiHealth, fetchApiOptions } from '../lib/whisperApi';
import type { TranscriptionOptions } from '../types';

// Disable MSW for this test file to allow direct fetch mocking
vi.mock('msw/node', () => ({
  setupServer: () => ({
    listen: vi.fn(),
    close: vi.fn(),
    resetHandlers: vi.fn(),
    use: vi.fn(),
  }),
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

class MockAbortController {
  abort = vi.fn();
  signal = { 
    aborted: false, 
    addEventListener: vi.fn(), 
    removeEventListener: vi.fn(),
    onabort: null,
    reason: undefined,
    throwIfAborted: vi.fn(),
    dispatchEvent: vi.fn()
  };
}

(global as any).AbortController = MockAbortController;

// Global timeout configuration
const TEST_TIMEOUT = 10000;

// Test utilities
const createMockFile = (name: string, size: number, type: string = 'audio/wav'): File => {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type });
};

const createMockResponse = (data: any, status: number = 200, headers: Record<string, string> = {}): Response => {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
    blob: vi.fn().mockResolvedValue(new Blob([JSON.stringify(data)])),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    clone: vi.fn().mockReturnThis(),
  } as unknown as Response;
};

const defaultTranscriptionOptions: TranscriptionOptions = {
  model: 'base',
  language: 'auto',
  task: 'transcribe',
  responseFormat: 'json',
  temperature: 0.0,
  useVadFilter: false,
};

const mockSuccessResponse = {
  text: 'Hello, this is a test transcription.',
  segments: [
    {
      id: 0,
      seek: 0,
      start: 0.0,
      end: 3.5,
      text: 'Hello, this is a test transcription.',
      tokens: [1, 2, 3, 4, 5],
      temperature: 0.0,
      avg_logprob: -0.5,
      compression_ratio: 2.0,
      no_speech_prob: 0.1,
    }
  ],
  language: 'en',
  duration: 3.5,
};

describe('API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    // Override the setup.ts fetch mock
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('transcribeAudio', () => {
    it('should successfully transcribe an audio file', async () => {
      const file = createMockFile('test.wav', 1024);
      const url = 'http://localhost:8000';
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce(createMockResponse(mockSuccessResponse));

      const result = await transcribeAudio(url, file, defaultTranscriptionOptions);

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(result).toEqual(mockSuccessResponse);
      
      const [fetchUrl, options] = mockFetch.mock.calls[0];
      expect(fetchUrl).toContain('/v1/audio/transcriptions');
      expect(options.method).toBe('POST');
      expect(options.body).toBeInstanceOf(FormData);
    }, TEST_TIMEOUT);

    it('should handle network errors gracefully', async () => {
      const file = createMockFile('test.wav', 1024);
      const url = 'http://localhost:8000';
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(transcribeAudio(url, file, defaultTranscriptionOptions))
        .rejects.toThrow('Network error');
    }, TEST_TIMEOUT);

    it('should handle HTTP error responses', async () => {
      const file = createMockFile('test.wav', 1024);
      const url = 'http://localhost:8000';
      const errorResponse = createMockResponse(
        { error: 'Invalid file format' }, 
        400
      );
      mockFetch.mockResolvedValueOnce(errorResponse);

      await expect(transcribeAudio(url, file, defaultTranscriptionOptions))
        .rejects.toThrow();
    }, TEST_TIMEOUT);

    it('should handle large files correctly', async () => {
      const largeFile = createMockFile('large.wav', 100 * 1024 * 1024); // 100MB
      const url = 'http://localhost:8000';
      mockFetch.mockResolvedValueOnce(createMockResponse(mockSuccessResponse));

      const result = await transcribeAudio(url, largeFile, defaultTranscriptionOptions);
      
      expect(result).toEqual(mockSuccessResponse);
      const formData = mockFetch.mock.calls[0][1].body as FormData;
      expect(formData.get('file')).toBe(largeFile);
    }, TEST_TIMEOUT);

    it('should properly format FormData with all options', async () => {
      const file = createMockFile('test.wav', 1024);
      const url = 'http://localhost:8000';
      const options: TranscriptionOptions = {
        ...defaultTranscriptionOptions,
        model: 'large',
        language: 'ja',
        temperature: 0.5,
        timestampGranularity: 'word',
        useVadFilter: true,
        prompt: 'Custom prompt',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockSuccessResponse));

      await transcribeAudio(url, file, options);

      const formData = mockFetch.mock.calls[0][1].body as FormData;
      expect(formData.get('model')).toBe('large');
      expect(formData.get('language')).toBe('ja');
      expect(formData.get('timestamp_granularities')).toBe('word');
      expect(formData.get('vad_filter')).toBe('true');
      // Note: The current implementation doesn't append temperature or prompt yet
    }, TEST_TIMEOUT);

    it('should handle different audio formats', async () => {
      const formats = [
        { name: 'test.mp3', type: 'audio/mp3' },
        { name: 'test.m4a', type: 'audio/m4a' },
        { name: 'test.flac', type: 'audio/flac' },
        { name: 'test.ogg', type: 'audio/ogg' },
      ];
      const url = 'http://localhost:8000';

      for (const format of formats) {
        const file = createMockFile(format.name, 1024, format.type);
        mockFetch.mockResolvedValueOnce(createMockResponse(mockSuccessResponse));

        const result = await transcribeAudio(url, file, defaultTranscriptionOptions);
        expect(result).toEqual(mockSuccessResponse);
      }
    }, TEST_TIMEOUT);

    it('should handle concurrent requests', async () => {
      const files = Array.from({ length: 3 }, (_, i) => 
        createMockFile(`test${i}.wav`, 1024)
      );
      const url = 'http://localhost:8000';

      // Mock different responses for each request
      files.forEach((_, i) => {
        mockFetch.mockResolvedValueOnce(createMockResponse({
          ...mockSuccessResponse,
          text: `Transcription ${i}`,
        }));
      });

      const promises = files.map(file => 
        transcribeAudio(url, file, defaultTranscriptionOptions)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      results.forEach((result: any, i: number) => {
        expect(result.text).toBe(`Transcription ${i}`);
      });
    }, TEST_TIMEOUT);
  });

  describe('checkApiHealth', () => {
    it('should check server health successfully', async () => {
      const url = 'http://localhost:8000';
      const healthResponse = { status: 'healthy', timestamp: Date.now() };
      
      // Clear the default mock implementation for this test
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce(createMockResponse(healthResponse));

      const result = await checkApiHealth(url);

      expect(mockFetch).toHaveBeenCalledWith(`${url}/health`, {
        headers: {}
      });
      expect(result.status).toBe('healthy');
    }, TEST_TIMEOUT);

    it('should handle unhealthy server status', async () => {
      const url = 'http://localhost:8000';
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { status: 'unhealthy', error: 'GPU not available' }, 
        503
      ));

      const result = await checkApiHealth(url);
      expect(result.status).toBe('error');
      expect(result.message).toContain('HTTP error! status: 503');
    }, TEST_TIMEOUT);

    it('should handle network errors', async () => {
      const url = 'http://localhost:8000';
      mockFetch.mockRejectedValueOnce(new Error('Connection to API server failed'));

      const result = await checkApiHealth(url);
      expect(result.status).toBe('error');
      expect(result.message).toContain('Connection to API server failed');
    }, TEST_TIMEOUT);

    it('should include authentication headers when provided', async () => {
      const url = 'http://localhost:8000';
      const token = 'test-token';
      const healthResponse = { status: 'healthy' };
      mockFetch.mockResolvedValueOnce(createMockResponse(healthResponse));

      await checkApiHealth(url, token);

      expect(mockFetch).toHaveBeenCalledWith(`${url}/health`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }, TEST_TIMEOUT);
  });

  describe('fetchApiOptions', () => {
    const mockModels = {
      data: [
        { id: 'tiny', task: 'transcribe', language: ['en', 'ja'] },
        { id: 'base', task: 'transcribe', language: ['en', 'ja', 'es'] },
        { id: 'large', task: 'transcribe', language: null },
      ]
    };

    it('should fetch available models successfully', async () => {
      const url = 'http://localhost:8000/v1/models';
      mockFetch.mockResolvedValueOnce(createMockResponse(mockModels));

      const result = await fetchApiOptions(url);

      expect(mockFetch).toHaveBeenCalledWith(url, {
        headers: {}
      });
      expect(result.models).toHaveLength(3);
      expect(result.models[0].id).toBe('tiny');
      expect(result.responseFormats).toContain('json');
      expect(result.timestampGranularities).toContain('word');
    }, TEST_TIMEOUT);

    it('should handle models endpoint errors', async () => {
      const url = 'http://localhost:8000/v1/models';
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Models not available' }, 
        503
      ));

      await expect(fetchApiOptions(url)).rejects.toThrow();
    }, TEST_TIMEOUT);

    it('should handle network errors for models endpoint', async () => {
      const url = 'http://localhost:8000/v1/models';
      mockFetch.mockRejectedValueOnce(new Error('Network unreachable'));

      await expect(fetchApiOptions(url)).rejects.toThrow('Network unreachable');
    }, TEST_TIMEOUT);

    it('should include authentication headers when provided', async () => {
      const url = 'http://localhost:8000/v1/models';
      const token = 'test-token';
      mockFetch.mockResolvedValueOnce(createMockResponse(mockModels));

      await fetchApiOptions(url, token);

      expect(mockFetch).toHaveBeenCalledWith(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }, TEST_TIMEOUT);

    it('should extract unique languages from models', async () => {
      const url = 'http://localhost:8000/v1/models';
      mockFetch.mockResolvedValueOnce(createMockResponse(mockModels));

      const result = await fetchApiOptions(url);

      expect(result.languages).toContain('en');
      expect(result.languages).toContain('ja');
      expect(result.languages).toContain('es');
      // Should not contain duplicates
      expect(result.languages.filter(lang => lang === 'en')).toHaveLength(1);
    }, TEST_TIMEOUT);
  });

  describe('error handling edge cases', () => {
    it('should handle malformed JSON response', async () => {
      const file = createMockFile('test.wav', 1024);
      const url = 'http://localhost:8000';
      const response = createMockResponse('malformed json');
      response.json = vi.fn().mockRejectedValue(new SyntaxError('Unexpected token'));
      
      mockFetch.mockResolvedValueOnce(response);

      await expect(transcribeAudio(url, file, defaultTranscriptionOptions))
        .rejects.toThrow();
    }, TEST_TIMEOUT);

    it('should handle empty file', async () => {
      const emptyFile = createMockFile('empty.wav', 0);
      const url = 'http://localhost:8000';
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'File is empty' }, 
        400
      ));

      await expect(transcribeAudio(url, emptyFile, defaultTranscriptionOptions))
        .rejects.toThrow();
    }, TEST_TIMEOUT);

    it('should handle unsupported file types', async () => {
      const invalidFile = createMockFile('test.txt', 1024, 'text/plain');
      const url = 'http://localhost:8000';
      mockFetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Unsupported file format' }, 
        415
      ));

      await expect(transcribeAudio(url, invalidFile, defaultTranscriptionOptions))
        .rejects.toThrow();
    }, TEST_TIMEOUT);

    it('should handle rate limiting', async () => {
      const file = createMockFile('test.wav', 1024);
      const url = 'http://localhost:8000';
      const rateLimitResponse = createMockResponse(
        { error: 'Rate limit exceeded' }, 
        429,
        { 'retry-after': '60' }
      );
      
      mockFetch.mockResolvedValueOnce(rateLimitResponse);

      await expect(transcribeAudio(url, file, defaultTranscriptionOptions))
        .rejects.toThrow();
    }, TEST_TIMEOUT);

    it('should handle CORS errors', async () => {
      const file = createMockFile('test.wav', 1024);
      const url = 'http://localhost:8000';
      const corsError = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValueOnce(corsError);

      await expect(transcribeAudio(url, file, defaultTranscriptionOptions))
        .rejects.toThrow('Failed to fetch');
    }, TEST_TIMEOUT);

    it('should handle timeout scenarios', async () => {
      const file = createMockFile('test.wav', 1024);
      const url = 'http://localhost:8000';
      
      // Mock fetch to simulate timeout using AbortController
      mockFetch.mockImplementationOnce(() => {
        return Promise.reject(new Error('Request timeout'));
      });

      await expect(transcribeAudio(url, file, defaultTranscriptionOptions))
        .rejects.toThrow('Request timeout');
    }, TEST_TIMEOUT);

    it('should handle responses with extra fields gracefully', async () => {
      const file = createMockFile('test.wav', 1024);
      const url = 'http://localhost:8000';
      const responseWithExtraFields = createMockResponse({
        ...mockSuccessResponse,
        extra_field: 'should be ignored',
        another_field: 42,
      });

      mockFetch.mockResolvedValueOnce(responseWithExtraFields);

      const result = await transcribeAudio(url, file, defaultTranscriptionOptions);
      
      // Should still work and contain expected fields
      expect(result.text).toBe(mockSuccessResponse.text);
      expect(result.segments).toEqual(mockSuccessResponse.segments);
    }, TEST_TIMEOUT);
  });
});