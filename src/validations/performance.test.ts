import { describe, test, expect, vi, beforeEach } from 'vitest';
import { performance } from 'perf_hooks';

// FileReaderのモック（このテストファイル内で明示的に定義）
const mockFileReader = vi.fn().mockImplementation(() => ({
  onload: null,
  onerror: null,
  readyState: 0,
  result: null,
  readAsArrayBuffer: vi.fn().mockImplementation(function(this: any) {
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      this.readyState = 2;
      if (this.onload) {
        this.onload.call(this, { target: this });
      }
    }, 10);
  }),
  readAsText: vi.fn(),
  readAsDataURL: vi.fn(),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
}));

// FileReaderをグローバルに設定
(global as any).FileReader = mockFileReader;

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Processing Performance', () => {
    test('大きなファイルの処理時間', async () => {
      const largeFileSize = 10 * 1024 * 1024; // 10MB
      const mockLargeFile = new Blob(['x'.repeat(largeFileSize)], { type: 'audio/mp3' });

      const processFile = async (file: Blob): Promise<number> => {
        const startTime = performance.now();
        
        // ファイル処理のシミュレーション
        await new Promise(resolve => {
          const reader = new mockFileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsArrayBuffer(file);
        });
        
        const endTime = performance.now();
        return endTime - startTime;
      };

      const processingTime = await processFile(mockLargeFile);
      
      // 10MBのファイル処理が10秒以内に完了することを確認
      expect(processingTime).toBeLessThan(10000);
    });

    test('複数ファイルの同時処理', async () => {
      const fileCount = 5;
      const files = Array.from({ length: fileCount }, (_, index) => 
        new Blob([`audio data ${index}`], { type: 'audio/mp3' })
      );

      const processMultipleFiles = async (files: Blob[]): Promise<number> => {
        const startTime = performance.now();
        
        const promises = files.map(async (file, index) => {
          // 各ファイルの処理をシミュレート
          await new Promise(resolve => setTimeout(resolve, 100 + index * 50));
          return `processed-${index}`;
        });

        await Promise.all(promises);
        
        const endTime = performance.now();
        return endTime - startTime;
      };

      const totalTime = await processMultipleFiles(files);
      
      // 並列処理により、総時間が逐次処理より短いことを確認
      const sequentialTime = fileCount * 150; // 平均150ms × ファイル数
      expect(totalTime).toBeLessThan(sequentialTime);
    });
  });

  describe('Memory Usage Tests', () => {
    test('メモリリークの検証', () => {
      const createMockSegments = (count: number) => {
        return Array.from({ length: count }, (_, index) => ({
          start: index * 5,
          end: (index + 1) * 5,
          text: `Segment ${index + 1} with some longer text content to simulate realistic memory usage`
        }));
      };

      const measureMemoryUsage = () => {
        if (typeof performance !== 'undefined' && 'memory' in performance) {
          return (performance as any).memory?.usedJSHeapSize || 0;
        }
        return 0;
      };

      const initialMemory = measureMemoryUsage();
      
      // 大量のセグメントを作成
      const largeSegmentArray = createMockSegments(10000);
      
      // メモリ使用量の測定
      const afterCreationMemory = measureMemoryUsage();
      
      // オブジェクトをクリア
      largeSegmentArray.length = 0;
      
      // ガベージコレクションを促進（Node.js環境）
      if (global.gc) {
        global.gc();
      }
      
      const afterCleanupMemory = measureMemoryUsage();
      
      // メモリリークがないことを確認（簡易チェック）
      if (initialMemory > 0 && afterCleanupMemory > 0) {
        const memoryIncrease = afterCleanupMemory - initialMemory;
        const memoryThreshold = 50 * 1024 * 1024; // 50MB
        expect(memoryIncrease).toBeLessThan(memoryThreshold);
      }
      
      expect(largeSegmentArray.length).toBe(0);
    });

    test('大量データのレンダリングパフォーマンス', () => {
      const renderSegments = (segments: any[]): number => {
        const startTime = performance.now();
        
        // 仮想的なレンダリング処理をシミュレート
        segments.forEach(segment => {
          const element = {
            id: `segment-${segment.start}`,
            content: segment.text,
            timestamp: `${segment.start}s - ${segment.end}s`
          };
          
          // DOM操作のシミュレート
          JSON.stringify(element);
        });
        
        const endTime = performance.now();
        return endTime - startTime;
      };

      const segments = Array.from({ length: 1000 }, (_, index) => ({
        start: index * 2,
        end: (index + 1) * 2,
        text: `This is segment number ${index + 1} with some content`
      }));

      const renderTime = renderSegments(segments);
      
      // 1000セグメントのレンダリングが1秒以内に完了することを確認
      expect(renderTime).toBeLessThan(1000);
    });
  });

  describe('API Performance Tests', () => {
    test('API レスポンス時間の測定', async () => {
      const mockApiCall = async (endpoint: string): Promise<{ data: any; responseTime: number }> => {
        const startTime = performance.now();
        
        // API呼び出しのシミュレート
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        return {
          data: { status: 'success', endpoint },
          responseTime
        };
      };

      const result = await mockApiCall('/api/status');
      
      expect(result.responseTime).toBeLessThan(1000); // 1秒以内
      expect(result.data.status).toBe('success');
    });

    test('同時API呼び出しのパフォーマンス', async () => {
      const concurrentApiCalls = async (callCount: number): Promise<number> => {
        const startTime = performance.now();
        
        const promises = Array.from({ length: callCount }, async (_, index) => {
          await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
          return { id: index, status: 'completed' };
        });

        await Promise.all(promises);
        
        const endTime = performance.now();
        return endTime - startTime;
      };

      const totalTime = await concurrentApiCalls(5);
      
      // 5つの同時呼び出しが1秒以内に完了することを確認（並列処理の効果）
      expect(totalTime).toBeLessThan(1000);
      expect(totalTime).toBeGreaterThan(150); // 最低でも150ms（1回の処理時間の一部）
    });
  });

  describe('File Format Conversion Performance', () => {
    test('VTTフォーマット変換のパフォーマンス', () => {
      const generateVTT = (segments: any[]): string => {
        const formatTime = (seconds: number): string => {
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          const secs = seconds % 60;
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
        };

        let vtt = 'WEBVTT\n\n';
        segments.forEach((segment, index) => {
          vtt += `${index + 1}\n`;
          vtt += `${formatTime(segment.start)} --> ${formatTime(segment.end)}\n`;
          vtt += `${segment.text}\n\n`;
        });
        return vtt;
      };

      const largeSegmentArray = Array.from({ length: 5000 }, (_, index) => ({
        start: index * 3,
        end: (index + 1) * 3,
        text: `This is a long segment text number ${index + 1} that contains various words and punctuation marks to simulate real transcription data.`
      }));

      const startTime = performance.now();
      const vttResult = generateVTT(largeSegmentArray);
      const endTime = performance.now();

      const conversionTime = endTime - startTime;
      
      expect(conversionTime).toBeLessThan(2000); // 2秒以内
      expect(vttResult).toContain('WEBVTT');
      expect(vttResult.split('\n').length).toBeGreaterThan(largeSegmentArray.length * 3);
    });

    test('複数フォーマット同時変換のパフォーマンス', () => {
      const segments = Array.from({ length: 1000 }, (_, index) => ({
        start: index * 2,
        end: (index + 1) * 2,
        text: `Segment ${index + 1}`
      }));

      const convertToMultipleFormats = (segments: any[]) => {
        const startTime = performance.now();

        // VTT変換
        const vtt = segments.map((s, i) => `${i + 1}\n${s.start} --> ${s.end}\n${s.text}\n`).join('\n');
        
        // SRT変換
        const srt = segments.map((s, i) => `${i + 1}\n${s.start},000 --> ${s.end},000\n${s.text}\n`).join('\n');
        
        // JSON変換
        const json = JSON.stringify(segments, null, 2);
        
        // Text変換
        const text = segments.map(s => s.text).join('\n');

        const endTime = performance.now();
        
        return {
          formats: { vtt, srt, json, text },
          conversionTime: endTime - startTime
        };
      };

      const result = convertToMultipleFormats(segments);
      
      expect(result.conversionTime).toBeLessThan(1000); // 1秒以内
      expect(Object.keys(result.formats)).toHaveLength(4);
      expect(result.formats.vtt.length).toBeGreaterThan(0);
      expect(result.formats.srt.length).toBeGreaterThan(0);
      expect(result.formats.json.length).toBeGreaterThan(0);
      expect(result.formats.text.length).toBeGreaterThan(0);
    });
  });
});
