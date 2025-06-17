import { AppState } from '../types/config';

// 型定義は types/config.ts に移動しました
export type { AppState } from '../types/config';

// 初期状態を生成する関数
export const createInitialAppState = (): AppState => {
  const getStoredValue = (key: string, defaultValue: string | boolean | number | undefined) => {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    if (typeof defaultValue === 'boolean') return stored === 'true';
    if (typeof defaultValue === 'number') {
      const parsed = parseFloat(stored);
      if (isNaN(parsed)) return defaultValue;
      // 温度値の場合は0-1の範囲でクランプ
      if (key === 'temperature') {
        return Math.max(0, Math.min(1, parsed));
      }
      return parsed;
    }
    return stored;
  };

  return {
    // API関連
    apiStatus: { status: 'unknown', message: '', details: '' },
    
    // 文字起こし設定
    useTemperature: localStorage.getItem('temperature') !== null,
    temperature: getStoredValue('temperature', 0.7) as number,
    useVadFilter: getStoredValue('useVadFilter', true) as boolean,
    prompt: getStoredValue('prompt', '') as string,
    hotwords: (() => {
      const stored = localStorage.getItem('hotwords');
      if (stored === null) return [];
      try {
        return JSON.parse(stored) || [];
      } catch {
        return [];
      }
    })(),
    
    // FFmpeg初期化状態
    ffmpegPreInitStatus: {
      isInitializing: false,
      isInitialized: false,
      initError: null,
    }
  };
};

// セレクター関数（型安全性とパフォーマンス向上）
export const selectApiStatus = (state: AppState) => state.apiStatus;
export const selectUseTemperature = (state: AppState) => state.useTemperature;
export const selectTemperature = (state: AppState) => state.temperature;
export const selectUseVadFilter = (state: AppState) => state.useVadFilter;
export const selectPrompt = (state: AppState) => state.prompt;
export const selectHotwords = (state: AppState) => state.hotwords;
export const selectFFmpegPreInitStatus = (state: AppState) => state.ffmpegPreInitStatus;
