import { describe, test, expect, beforeEach, vi } from 'vitest';
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
import { renderHook, act } from '@testing-library/react';

// localStorageのモックを明示的に作成
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

// グローバルなlocalStorageをモック
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('AppState Store', () => {
  beforeEach(() => {
    // LocalStorageをクリア（モックの呼び出しをリセット）
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  test('初期状態が正しく設定される', () => {
    const initialState = createInitialAppState();

    expect(initialState).toEqual({
      apiStatus: { status: 'unknown', message: '', details: '' },
      useTemperature: false,
      temperature: 0.7,
      useVadFilter: true, // デフォルトでON
      prompt: '',
      hotwords: [],
      ffmpegPreInitStatus: {
        isInitializing: false,
        isInitialized: false,
        initError: null,
      }
    });
  });

  test('VADフィルターのデフォルト値がtrueになる', () => {
    const initialState = createInitialAppState();
    expect(initialState.useVadFilter).toBe(true);
  });

  test('LocalStorageからVADフィルターの設定を読み込む', () => {
    mockLocalStorage.setItem('useVadFilter', 'false');
    mockLocalStorage.getItem.mockReturnValue('false');
    
    const initialState = createInitialAppState();
    expect(initialState.useVadFilter).toBe(false);
  });

  test('温度パラメータの範囲チェック', () => {
    const state = createInitialAppState();
    
    expect(state.temperature).toBeGreaterThanOrEqual(0);
    expect(state.temperature).toBeLessThanOrEqual(1);
  });
});

describe('Store Selectors', () => {
  test('セレクター関数が正しく動作する', () => {
    const mockState: AppState = {
      apiStatus: { status: 'healthy', message: 'API Ready', details: '' },
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

    expect(selectApiStatus(mockState)).toEqual({ status: 'healthy', message: 'API Ready', details: '' });
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
});

describe('Store State Validation', () => {
  test('ホットワードの配列が正しく処理される', () => {
    const state = createInitialAppState();
    
    expect(Array.isArray(state.hotwords)).toBe(true);
    expect(state.hotwords.length).toBe(0);
  });

  test('APIステータスの構造が正しい', () => {
    const state = createInitialAppState();
    
    expect(state.apiStatus).toHaveProperty('status');
    expect(state.apiStatus).toHaveProperty('message');
    expect(state.apiStatus).toHaveProperty('details');
    expect(typeof state.apiStatus.status).toBe('string');
    expect(typeof state.apiStatus.message).toBe('string');
    expect(typeof state.apiStatus.details).toBe('string');
  });

  test('FFmpeg初期化ステータスの構造が正しい', () => {
    const state = createInitialAppState();
    
    expect(state.ffmpegPreInitStatus).toHaveProperty('isInitializing');
    expect(state.ffmpegPreInitStatus).toHaveProperty('isInitialized');
    expect(state.ffmpegPreInitStatus).toHaveProperty('initError');
    expect(typeof state.ffmpegPreInitStatus.isInitializing).toBe('boolean');
    expect(typeof state.ffmpegPreInitStatus.isInitialized).toBe('boolean');
  });
});
