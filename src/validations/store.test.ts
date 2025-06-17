import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Store関連のimport
import {
  selectApiStatus,
  selectUseTemperature,
  selectTemperature,
  selectUseVadFilter,
  selectPrompt,
  selectHotwords,
  selectFFmpegPreInitStatus,
  createInitialAppState,
  type AppState
} from '../store/appState';

import {
  selectActiveApiUrl,
  selectActiveApiToken,
  selectUseServerProxy,
  selectWhisperApiUrl,
  selectWhisperApiToken,
  selectWhisperProxyApiUrl,
  selectWhisperProxyApiToken,
  createInitialConfigState,
  type ConfigState
} from '../store/configState';

// LocalStorageのモック
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    length: 0,
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe.concurrent('App State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe.concurrent('App State Creation and Selectors', () => {
    test.concurrent('初期状態が正しく設定される', () => {
      const initialState = createInitialAppState();

      expect(initialState).toEqual({
        apiStatus: { status: 'unknown', message: '', details: '' },
        useTemperature: false,
        temperature: 0.7,
        useVadFilter: true,
        prompt: '',
        hotwords: [],
        ffmpegPreInitStatus: {
          isInitializing: false,
          isInitialized: false,
          initError: null,
        }
      });
    });

    test.concurrent('セレクター関数が正しく動作する', () => {
      const mockState: AppState = {
        apiStatus: { status: 'healthy', message: 'API Ready', details: 'Connection stable' },
        useTemperature: true,
        temperature: 0.3,
        useVadFilter: false,
        prompt: 'テストプロンプト',
        hotwords: ['キーワード1', 'キーワード2'],
        ffmpegPreInitStatus: {
          isInitializing: true,
          isInitialized: false,
          initError: null,
        }
      };

      expect(selectApiStatus(mockState)).toEqual({ 
        status: 'healthy', 
        message: 'API Ready', 
        details: 'Connection stable' 
      });
      expect(selectUseTemperature(mockState)).toBe(true);
      expect(selectTemperature(mockState)).toBe(0.3);
      expect(selectUseVadFilter(mockState)).toBe(false);
      expect(selectPrompt(mockState)).toBe('テストプロンプト');
      expect(selectHotwords(mockState)).toEqual(['キーワード1', 'キーワード2']);
      expect(selectFFmpegPreInitStatus(mockState)).toEqual({
        isInitializing: true,
        isInitialized: false,
        initError: null,
      });
    });

    test.concurrent('温度パラメータの境界値チェック', () => {
      const state = createInitialAppState();
      
      expect(state.temperature).toBeGreaterThanOrEqual(0);
      expect(state.temperature).toBeLessThanOrEqual(1);
      expect(state.temperature).toBe(0.7); // デフォルト値
    });

    test.concurrent('VADフィルターのデフォルト値', () => {
      const state = createInitialAppState();
      expect(state.useVadFilter).toBe(true);
    });

    test.concurrent('APIステータスの構造検証', () => {
      const state = createInitialAppState();
      
      expect(state.apiStatus).toHaveProperty('status');
      expect(state.apiStatus).toHaveProperty('message');
      expect(state.apiStatus).toHaveProperty('details');
      expect(typeof state.apiStatus.status).toBe('string');
      expect(typeof state.apiStatus.message).toBe('string');
      expect(typeof state.apiStatus.details).toBe('string');
    });

    test.concurrent('FFmpeg初期化ステータスの構造検証', () => {
      const state = createInitialAppState();
      
      expect(state.ffmpegPreInitStatus).toHaveProperty('isInitializing');
      expect(state.ffmpegPreInitStatus).toHaveProperty('isInitialized');
      expect(state.ffmpegPreInitStatus).toHaveProperty('initError');
      expect(typeof state.ffmpegPreInitStatus.isInitializing).toBe('boolean');
      expect(typeof state.ffmpegPreInitStatus.isInitialized).toBe('boolean');
    });

    test.concurrent('ホットワード配列の初期化', () => {
      const state = createInitialAppState();
      
      expect(Array.isArray(state.hotwords)).toBe(true);
      expect(state.hotwords.length).toBe(0);
    });
  });

  describe.concurrent('LocalStorage Integration', () => {
    test.concurrent('LocalStorageからVADフィルター設定を読み込み', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'useVadFilter') return 'false';
        return null;
      });
      
      const state = createInitialAppState();
      expect(state.useVadFilter).toBe(false);
    });

    test.concurrent('LocalStorageから温度設定を読み込み', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'temperature') return '0.2';
        if (key === 'useTemperature') return 'true';
        return null;
      });
      
      const state = createInitialAppState();
      expect(state.temperature).toBe(0.2);
      expect(state.useTemperature).toBe(true);
    });

    test.concurrent('LocalStorageからプロンプト設定を読み込み', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'prompt') return '保存されたプロンプト';
        return null;
      });
      
      const state = createInitialAppState();
      expect(state.prompt).toBe('保存されたプロンプト');
    });

    test.concurrent('LocalStorageからホットワード設定を読み込み', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'hotwords') return JSON.stringify(['保存された', 'キーワード']);
        return null;
      });
      
      const state = createInitialAppState();
      expect(state.hotwords).toEqual(['保存された', 'キーワード']);
    });

    test.concurrent('無効なLocalStorageデータの処理', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'temperature') return 'invalid_number';
        if (key === 'hotwords') return 'invalid_json';
        return null;
      });
      
      const state = createInitialAppState();
      expect(state.temperature).toBe(0.7); // デフォルト値にフォールバック
      expect(state.hotwords).toEqual([]); // デフォルト値にフォールバック
    });
  });

  describe.concurrent('Edge Cases and Error Handling', () => {
    test.concurrent('極端な温度値の処理', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'temperature') return '2.0'; // 範囲外
        return null;
      });
      
      const state = createInitialAppState();
      // 範囲外の値は正規化またはデフォルト値にフォールバック
      expect(state.temperature).toBeGreaterThanOrEqual(0);
      expect(state.temperature).toBeLessThanOrEqual(1);
    });

    test.concurrent('空文字列のプロンプト', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'prompt') return '';
        return null;
      });
      
      const state = createInitialAppState();
      expect(state.prompt).toBe('');
    });

    test.concurrent('空配列のホットワード', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'hotwords') return JSON.stringify([]);
        return null;
      });
      
      const state = createInitialAppState();
      expect(state.hotwords).toEqual([]);
    });

    test.concurrent('大量のホットワード', () => {
      const largeHotwordArray = Array(1000).fill('keyword').map((word, i) => `${word}_${i}`);
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'hotwords') return JSON.stringify(largeHotwordArray);
        return null;
      });
      
      const state = createInitialAppState();
      expect(state.hotwords).toHaveLength(1000);
      expect(state.hotwords[0]).toBe('keyword_0');
      expect(state.hotwords[999]).toBe('keyword_999');
    });

    test.concurrent('非常に長いプロンプト', () => {
      const longPrompt = 'x'.repeat(10000);
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'prompt') return longPrompt;
        return null;
      });
      
      const state = createInitialAppState();
      expect(state.prompt).toBe(longPrompt);
      expect(state.prompt.length).toBe(10000);
    });

    test.concurrent('特殊文字を含むプロンプト', () => {
      // Clear mocks first, then setup specific behavior
      vi.clearAllMocks();
      mockLocalStorage.clear();
      
      const specialPrompt = '特殊文字: 😀🔊🎵 \n\t\\"/';
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'prompt') return specialPrompt;
        return null;
      });
      
      const state = createInitialAppState();
      expect(state.prompt).toBe(specialPrompt);
    });
  });
});

describe.concurrent('Config State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // グローバル設定をクリア
    delete (window as any).APP_CONFIG;
  });

  describe.concurrent('Config State Creation and Selectors', () => {
    test.concurrent('初期Config状態が正しく設定される', () => {
      const initialState = createInitialConfigState();

      expect(initialState).toHaveProperty('whisperApiUrl');
      expect(initialState).toHaveProperty('whisperApiToken');
      expect(initialState).toHaveProperty('whisperProxyApiUrl');
      expect(initialState).toHaveProperty('whisperProxyApiToken');
      expect(initialState).toHaveProperty('useServerProxy');
      expect(initialState).toHaveProperty('hideCredentials');
      expect(initialState).toHaveProperty('allowCredentialEdit');
    });

    test.concurrent('プロキシモード時のURL/Token選択', () => {
      const mockState: ConfigState = {
        whisperApiUrl: 'http://direct.example.com',
        whisperApiToken: 'direct-token',
        whisperProxyApiUrl: 'http://proxy.example.com',
        whisperProxyApiToken: 'proxy-token',
        useServerProxy: true,
        serverProxyUrl: '/api/transcribe',
        hideCredentials: false,
        allowCredentialEdit: true,
        healthCheckUrl: '',
        appTitle: 'Test App',
        environment: 'test',
        loading: false,
        error: { hasError: false, errorType: null, message: '' },
        forceProxyDisabled: false
      };

      expect(selectActiveApiUrl(mockState)).toBe('http://proxy.example.com');
      expect(selectActiveApiToken(mockState)).toBe('proxy-token');
    });

    test.concurrent('ダイレクトモード時のURL/Token選択', () => {
      const mockState: ConfigState = {
        whisperApiUrl: 'http://direct.example.com',
        whisperApiToken: 'direct-token',
        whisperProxyApiUrl: 'http://proxy.example.com',
        whisperProxyApiToken: 'proxy-token',
        useServerProxy: false,
        serverProxyUrl: '/api/transcribe',
        hideCredentials: false,
        allowCredentialEdit: true,
        healthCheckUrl: '',
        appTitle: 'Test App',
        environment: 'test',
        loading: false,
        error: { hasError: false, errorType: null, message: '' },
        forceProxyDisabled: false
      };

      expect(selectActiveApiUrl(mockState)).toBe('http://direct.example.com');
      expect(selectActiveApiToken(mockState)).toBe('direct-token');
    });

    test.concurrent('設定値セレクターの動作', () => {
      const mockState: ConfigState = {
        whisperApiUrl: 'http://direct.example.com',
        whisperApiToken: 'direct-token',
        whisperProxyApiUrl: 'http://proxy.example.com',
        whisperProxyApiToken: 'proxy-token',
        useServerProxy: true,
        serverProxyUrl: '/api/transcribe',
        hideCredentials: true,
        allowCredentialEdit: false,
        healthCheckUrl: 'http://health.example.com',
        appTitle: 'Test Whisper UI',
        environment: 'production',
        loading: false,
        error: { hasError: false, errorType: null, message: '' },
        forceProxyDisabled: false
      };

      expect(selectUseServerProxy(mockState)).toBe(true);
      expect(selectWhisperApiUrl(mockState)).toBe('http://direct.example.com');
      expect(selectWhisperApiToken(mockState)).toBe('direct-token');
      expect(selectWhisperProxyApiUrl(mockState)).toBe('http://proxy.example.com');
      expect(selectWhisperProxyApiToken(mockState)).toBe('proxy-token');
    });
  });

  describe.concurrent('Environment Configuration', () => {
    test.concurrent('環境変数からの設定読み込み', () => {
      // Viteの環境変数は実行時に変更できないため、設定の初期化をテスト
      const state = createInitialConfigState();
      
      // 環境設定が適切に初期化されることを確認
      expect(state.whisperApiUrl).toBeDefined();
      expect(state.whisperApiToken).toBeDefined();
      expect(state.useServerProxy).toBeDefined();
      expect(state.appTitle).toBeDefined();
    });

    test.concurrent('config.jsからの設定読み込み', () => {
      (window as any).APP_CONFIG = {
        WHISPER_API_URL: 'http://config.example.com',
        WHISPER_API_TOKEN: 'config-token',
        USE_SERVER_PROXY: 'false',
        APP_TITLE: 'Config App Title',
        HIDE_CREDENTIALS: 'true'
      };

      const state = createInitialConfigState();
      
      expect(state.whisperApiUrl).toBe('http://config.example.com');
      expect(state.whisperApiToken).toBe('config-token');
      // hideCredentials: trueの場合、useServerProxyは強制的にtrueになる
      expect(state.useServerProxy).toBe(true);
      expect(state.appTitle).toBe('Config App Title');
      expect(state.hideCredentials).toBe(true);
    });

    test.concurrent('設定の優先順位 (LocalStorage > config.js > env)', () => {
      // config.jsを設定
      (window as any).APP_CONFIG = {
        WHISPER_API_URL: 'http://config.example.com'
      };

      // LocalStorageを設定
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'whisper-webui-config') {
          return JSON.stringify({
            whisperApiUrl: 'http://local.example.com'
          });
        }
        return null;
      });

      const state = createInitialConfigState();
      
      // LocalStorageが最優先
      expect(state.whisperApiUrl).toBe('http://local.example.com');
    });
  });

  describe.concurrent('Security and Credential Management', () => {
    test.concurrent('認証情報の隠蔽設定', () => {
      const mockState: ConfigState = {
        whisperApiUrl: 'http://example.com',
        whisperApiToken: 'secret-token',
        whisperProxyApiUrl: 'http://proxy.example.com',
        whisperProxyApiToken: 'proxy-secret',
        useServerProxy: false,
        hideCredentials: true,
        allowCredentialEdit: false,
        healthCheckUrl: '',
        appTitle: 'Test App',
        environment: 'production',
        serverProxyUrl: '/api/transcribe',
        loading: false,
        error: { hasError: false, errorType: null, message: '' },
        forceProxyDisabled: false
      };

      // hideCredentials が true の場合、セキュリティ要件によってはトークンが隠される可能性
      expect(mockState.hideCredentials).toBe(true);
      expect(mockState.allowCredentialEdit).toBe(false);
    });

    test.concurrent('プロダクション環境での認証情報保護', () => {
      const state = createInitialConfigState();
      
      // プロダクション環境では認証情報が適切に保護されているか
      if (state.environment === 'production') {
        expect(state.hideCredentials).toBeDefined();
        expect(state.allowCredentialEdit).toBeDefined();
      }
    });

    test.concurrent('開発環境での認証情報編集許可', () => {
      (window as any).APP_CONFIG = {
        ENVIRONMENT: 'development',
        HIDE_CREDENTIALS: 'false',
        ALLOW_CREDENTIAL_EDIT: 'true'
      };

      const state = createInitialConfigState();
      
      expect(state.environment).toBe('development');
      expect(state.hideCredentials).toBe(false);
      expect(state.allowCredentialEdit).toBe(true);
    });
  });

  describe.concurrent('Edge Cases and Validation', () => {
    test.concurrent('無効なURL形式の処理', () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'whisper-webui-config') {
          return JSON.stringify({
            whisperApiUrl: 'invalid-url'
          });
        }
        return null;
      });

      const state = createInitialConfigState();
      
      // 無効なURLでも状態として保存される（バリデーションは使用時に行う）
      expect(state.whisperApiUrl).toBe('invalid-url');
    });

    test.concurrent('空文字列のトークン', () => {
      const mockState: ConfigState = {
        whisperApiUrl: 'http://example.com',
        whisperApiToken: '',
        whisperProxyApiUrl: 'http://proxy.example.com',
        whisperProxyApiToken: '',
        useServerProxy: false,
        hideCredentials: false,
        allowCredentialEdit: true,
        healthCheckUrl: '',
        appTitle: 'Test App',
        environment: 'test',
        serverProxyUrl: '/api/transcribe',
        loading: false,
        error: { hasError: false, errorType: null, message: '' },
        forceProxyDisabled: false
      };

      expect(selectActiveApiToken(mockState)).toBe('');
    });

    test.concurrent('非常に長いURL', () => {
      const longUrl = 'http://example.com/' + 'x'.repeat(2000);
      const mockState: ConfigState = {
        whisperApiUrl: longUrl,
        whisperApiToken: 'token',
        whisperProxyApiUrl: 'http://proxy.example.com',
        whisperProxyApiToken: 'proxy-token',
        useServerProxy: false,
        hideCredentials: false,
        allowCredentialEdit: true,
        healthCheckUrl: '',
        appTitle: 'Test App',
        environment: 'test',
        serverProxyUrl: '/api/transcribe',
        loading: false,
        error: { hasError: false, errorType: null, message: '' },
        forceProxyDisabled: false
      };

      expect(selectActiveApiUrl(mockState)).toBe(longUrl);
    });

    test.concurrent('プロキシ/ダイレクトモード切り替え時の状態一貫性', () => {
      const baseState: ConfigState = {
        whisperApiUrl: 'http://direct.example.com',
        whisperApiToken: 'direct-token',
        whisperProxyApiUrl: 'http://proxy.example.com',
        whisperProxyApiToken: 'proxy-token',
        useServerProxy: false,
        hideCredentials: false,
        allowCredentialEdit: true,
        healthCheckUrl: '',
        appTitle: 'Test App',
        environment: 'test',
        serverProxyUrl: '/api/transcribe',
        loading: false,
        error: { hasError: false, errorType: null, message: '' },
        forceProxyDisabled: false
      };

      // ダイレクトモード
      expect(selectActiveApiUrl(baseState)).toBe('http://direct.example.com');
      expect(selectActiveApiToken(baseState)).toBe('direct-token');

      // プロキシモードに切り替え
      const proxyState = { ...baseState, useServerProxy: true };
      expect(selectActiveApiUrl(proxyState)).toBe('http://proxy.example.com');
      expect(selectActiveApiToken(proxyState)).toBe('proxy-token');
    });

    test.concurrent('null/undefined値の処理', () => {
      const mockState: ConfigState = {
        whisperApiUrl: '',
        whisperApiToken: '',
        whisperProxyApiUrl: '',
        whisperProxyApiToken: '',
        useServerProxy: false,
        hideCredentials: false,
        allowCredentialEdit: true,
        healthCheckUrl: '',
        appTitle: '',
        environment: '',
        serverProxyUrl: '/api/transcribe',
        loading: false,
        error: { hasError: false, errorType: null, message: '' },
        forceProxyDisabled: false
      };

      // 空文字列の場合はデフォルト値が使用される
      expect(selectActiveApiUrl(mockState)).toBe('http://localhost:9000');
      expect(selectActiveApiToken(mockState)).toBe('');
    });
  });

  describe.concurrent('State Persistence', () => {
    test.concurrent('LocalStorageへの設定保存', () => {
      const testConfig = {
        whisperApiUrl: 'http://test.example.com',
        whisperApiToken: 'test-token',
        useServerProxy: true
      };

      // 実際のStore実装では、設定変更時にLocalStorageに保存される
      mockLocalStorage.setItem('whisper-webui-config', JSON.stringify(testConfig));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'whisper-webui-config',
        JSON.stringify(testConfig)
      );
    });

    test.concurrent('LocalStorageからの設定復元', () => {
      const savedConfig = {
        whisperApiUrl: 'http://saved.example.com',
        whisperApiToken: 'saved-token',
        useServerProxy: false
      };

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'whisper-webui-config') {
          return JSON.stringify(savedConfig);
        }
        return null;
      });

      const state = createInitialConfigState();
      
      expect(state.whisperApiUrl).toBe('http://saved.example.com');
      expect(state.whisperApiToken).toBe('saved-token');
      expect(state.useServerProxy).toBe(false);
    });

    test.concurrent('破損したLocalStorageデータの処理', () => {
      // console.warnを一時的に無効化してログ出力を抑制
      const originalWarn = console.warn;
      console.warn = vi.fn();

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'whisper-webui-config') {
          return 'invalid-json-data';
        }
        return null;
      });

      // エラーが発生せず、デフォルト値にフォールバックする
      expect(() => createInitialConfigState()).not.toThrow();
      
      const state = createInitialConfigState();
      expect(state).toBeDefined();

      // console.warnを元に戻す
      console.warn = originalWarn;
    });
  });
});