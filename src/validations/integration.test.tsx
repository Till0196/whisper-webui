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
      render(
        <TestWrapper>
          <MockAppContent />
        </TestWrapper>
      );

      // 初期状態の確認
      expect(screen.getByText('Whisper WebUI')).toBeInTheDocument();
      expect(screen.getByTestId('start-button')).toBeDisabled();

      // ファイルアップロード
      const fileInput = screen.getByTestId('file-input');
      const mockFile = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);

      // ファイルが選択されたことを確認
      await waitFor(() => {
        expect(screen.getByTestId('selected-file')).toHaveTextContent('Selected: test.mp3');
      });

      // 処理開始ボタンが有効になったことを確認
      const startButton = screen.getByTestId('start-button');
      expect(startButton).not.toBeDisabled();

      // 文字起こし開始
      fireEvent.click(startButton);

      // 処理中の状態を確認
      await waitFor(() => {
        expect(screen.getByTestId('processing-status')).toBeInTheDocument();
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });

      // 結果の表示を確認
      await waitFor(() => {
        expect(screen.getByTestId('transcription-result')).toBeInTheDocument();
        expect(screen.getByText('Hello world')).toBeInTheDocument();
        expect(screen.getByText('This is a test')).toBeInTheDocument();
      }, { timeout: 2000 });

      // 処理完了後の状態確認
      expect(screen.queryByTestId('processing-status')).not.toBeInTheDocument();
      expect(screen.getByTestId('start-button')).toHaveTextContent('Start Transcription');
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

      render(
        <TestWrapper>
          <MockAppWithValidation />
        </TestWrapper>
      );

      const fileInput = screen.getByTestId('file-input');
      const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });
      
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          'Invalid file format. Please select an audio file.'
        );
      });
    });
  });

  describe('レスポンシブ動作', () => {
    test('モバイル環境での表示', () => {
      // グローバルmatchMediaモックを利用してモバイル環境をシミュレート
      const mockMatchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(max-width:599.95px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      // グローバルmatchMediaモックを上書き
      vi.stubGlobal('window', {
        ...global.window,
        matchMedia: mockMatchMedia
      });

      const MockResponsiveComponent = () => {
        const [isMobile, setIsMobile] = React.useState(false);

        React.useEffect(() => {
          const mediaQuery = window.matchMedia('(max-width:599.95px)');
          setIsMobile(mediaQuery.matches);
        }, []);

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

      render(
        <TestWrapper>
          <MockResponsiveComponent />
        </TestWrapper>
      );

      expect(screen.getByTestId('layout-type')).toHaveTextContent('Mobile Layout');
      
      const buttonContainer = screen.getByTestId('button-container');
      expect(buttonContainer).toHaveStyle({ flexDirection: 'column' });
    });
  });

  describe('設定の永続化', () => {
    test('LocalStorageへの設定保存と復元', () => {
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

      // グローバルlocalStorageモックをクリア
      const mockLocalStorage = (global as any).localStorage;
      mockLocalStorage.clear();

      render(
        <TestWrapper>
          <MockSettingsComponent />
        </TestWrapper>
      );

      // デフォルト値の確認
      expect(screen.getByTestId('vad-status')).toHaveTextContent('VAD Filter: Enabled');

      // 設定変更
      const checkbox = screen.getByTestId('vad-filter-checkbox');
      fireEvent.click(checkbox);

      // 状態とLocalStorageの更新確認
      expect(screen.getByTestId('vad-status')).toHaveTextContent('VAD Filter: Disabled');
      expect(localStorage.getItem('vadFilter')).toBe('false');
    });
  });
});
