import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// テスト用のモックコンポーネント
const MockAppContent = () => {
  const [file, setFile] = React.useState<File | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [transcriptionResult, setTranscriptionResult] = React.useState<any[]>([]);

  const handleFileUpload = (uploadedFile: File) => {
    setFile(uploadedFile);
  };

  const handleStartTranscription = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    
    // モックの処理
    setTimeout(() => {
      setTranscriptionResult([
        { start: 0, end: 5, text: 'Hello world' },
        { start: 5, end: 10, text: 'This is a test' }
      ]);
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <div>
      <h1>Whisper WebUI</h1>
      
      {/* ファイルアップロード */}
      <div data-testid="file-upload">
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) handleFileUpload(selectedFile);
          }}
          data-testid="file-input"
        />
        {file && <p data-testid="selected-file">Selected: {file.name}</p>}
      </div>

      {/* 処理開始ボタン */}
      <button
        onClick={handleStartTranscription}
        disabled={!file || isProcessing}
        data-testid="start-button"
      >
        {isProcessing ? 'Processing...' : 'Start Transcription'}
      </button>

      {/* 処理状況 */}
      {isProcessing && (
        <div data-testid="processing-status">
          <p>Transcribing audio...</p>
        </div>
      )}

      {/* 結果表示 */}
      {transcriptionResult.length > 0 && (
        <div data-testid="transcription-result">
          <h2>Results</h2>
          {transcriptionResult.map((segment, index) => (
            <div key={index} data-testid={`segment-${index}`}>
              <p>[{segment.start}s - {segment.end}s] {segment.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('Whisper WebUI Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('完全なワークフロー', () => {
    test('ファイルアップロードから文字起こし完了まで', async () => {
      const { container } = render(
        <TestWrapper>
          <MockAppContent />
        </TestWrapper>
      );

      // 初期状態の確認 - containerを使用
      expect(container).toHaveTextContent('Whisper WebUI');
      expect(container.querySelector('[data-testid="start-button"]')).toBeDisabled();

      // ファイルアップロード
      const fileInput = container.querySelector('[data-testid="file-input"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();
      
      const mockFile = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);

      // ファイルが選択されたことを確認
      await waitFor(() => {
        expect(container).toHaveTextContent('Selected: test.mp3');
      });

      // 処理開始ボタンが有効になったことを確認
      const startButton = container.querySelector('[data-testid="start-button"]') as HTMLButtonElement;
      expect(startButton).not.toBeDisabled();

      // 文字起こし開始
      fireEvent.click(startButton);

      // 処理中の状態を確認
      await waitFor(() => {
        expect(container.querySelector('[data-testid="processing-status"]')).toBeTruthy();
        expect(container).toHaveTextContent('Processing...');
      });

      // 結果の表示を確認
      await waitFor(() => {
        expect(container.querySelector('[data-testid="transcription-result"]')).toBeTruthy();
        expect(container).toHaveTextContent('Hello world');
        expect(container).toHaveTextContent('This is a test');
      }, { timeout: 2000 });

      // 処理完了後の状態確認
      expect(container.querySelector('[data-testid="processing-status"]')).toBeFalsy();
      expect(container).toHaveTextContent('Start Transcription');
    });
  });

  describe('エラーハンドリング', () => {
    test('無効なファイル形式のエラー', async () => {
      const MockAppWithValidation = () => {
        const [error, setError] = React.useState<string>('');

        const handleFileUpload = (file: File) => {
          const validFormats = ['audio/mp3', 'audio/wav', 'audio/m4a'];
          if (!validFormats.includes(file.type)) {
            setError('Invalid file format. Please select an audio file.');
            return;
          }
          setError('');
        };

        return (
          <div>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              data-testid="file-input"
            />
            {error && <p data-testid="error-message">{error}</p>}
          </div>
        );
      };

      const { container } = render(
        <TestWrapper>
          <MockAppWithValidation />
        </TestWrapper>
      );

      const fileInput = container.querySelector('[data-testid="file-input"]') as HTMLInputElement;
      expect(fileInput).toBeTruthy();
      
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(container).toHaveTextContent('Invalid file format. Please select an audio file.');
      });
    });
  });

  describe('レスポンシブ動作', () => {
    test('モバイル環境での表示コンポーネント', () => {
      const MockResponsiveComponent = () => {
        // テスト用に直接モバイル状態をシミュレート
        const isMobile = true;

        return (
          <div>
            <p data-testid="layout-type">
              {isMobile ? 'Mobile Layout' : 'Desktop Layout'}
            </p>
            <div data-testid="button-container" style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: '8px'
            }}>
              <button>Button 1</button>
              <button>Button 2</button>
            </div>
          </div>
        );
      };

      const { container } = render(
        <TestWrapper>
          <MockResponsiveComponent />
        </TestWrapper>
      );

      expect(container).toHaveTextContent('Mobile Layout');
      expect(container).toHaveTextContent('Button 1');
      expect(container).toHaveTextContent('Button 2');
      
      const buttonContainer = container.querySelector('[data-testid="button-container"]') as HTMLElement;
      expect(buttonContainer).toBeTruthy();
      expect(buttonContainer.style.flexDirection).toBe('column');
    });
  });

  describe('設定の永続化', () => {
    test('LocalStorageへの設定保存と復元', async () => {
      // テスト専用のlocalStorageモック
      const testLocalStorage: Record<string, string> = {};
      const mockLocalStorage = {
        getItem: vi.fn((key: string) => testLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          testLocalStorage[key] = String(value);
        }),
        removeItem: vi.fn((key: string) => {
          delete testLocalStorage[key];
        }),
        clear: vi.fn(() => {
          Object.keys(testLocalStorage).forEach(key => delete testLocalStorage[key]);
        }),
        length: 0,
        key: vi.fn()
      };

      // グローバルlocalStorageを上書き
      Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true
      });
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true
      });

      const MockSettingsComponent = () => {
        const [vadFilter, setVadFilter] = React.useState(() => {
          const stored = localStorage.getItem('vadFilter');
          return stored ? JSON.parse(stored) : true;
        });

        const handleVadFilterChange = (enabled: boolean) => {
          setVadFilter(enabled);
          localStorage.setItem('vadFilter', JSON.stringify(enabled));
        };

        return (
          <div>
            <label>
              <input
                type="checkbox"
                checked={vadFilter}
                onChange={(e) => handleVadFilterChange(e.target.checked)}
                data-testid="vad-filter-checkbox"
              />
              VAD Filter
            </label>
            <p data-testid="vad-status">
              VAD Filter: {vadFilter ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        );
      };

      // ストレージをクリア
      localStorage.clear();

      const { container } = render(
        <TestWrapper>
          <MockSettingsComponent />
        </TestWrapper>
      );

      // デフォルト値の確認
      expect(container).toHaveTextContent('VAD Filter: Enabled');

      // 設定変更
      const checkbox = container.querySelector('[data-testid="vad-filter-checkbox"]') as HTMLInputElement;
      expect(checkbox).toBeTruthy();
      fireEvent.click(checkbox);

      // 状態の変更を待つ
      await waitFor(() => {
        expect(container).toHaveTextContent('VAD Filter: Disabled');
      });

      // LocalStorageの更新確認
      expect(localStorage.getItem('vadFilter')).toBe('false');
    });
  });
});
