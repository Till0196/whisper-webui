import { StateStore, useStateSelector, useStateUpdater } from '../hooks/useStateManager';
import { 
  createInitialThemeState,
  selectThemeMode,
  selectIsDarkMode
} from './themeState';
import { useCallback, useEffect } from 'react';
import { ThemeMode } from '../components/ThemeSelector';

// グローバルテーマストア（シングルトン）
const globalThemeStore = new StateStore(createInitialThemeState());

/**
 * テーマ状態を作成するhook（Appコンポーネントでのみ使用）
 */
export function useCreateThemeState() {
  return globalThemeStore;
}

/**
 * テーマ状態を取得するhook（状態変更通知なし）
 */
export function useThemeStore() {
  return globalThemeStore;
}

/**
 * テーマモードを購読するhook
 */
export function useThemeMode() {
  const store = useThemeStore();
  const stableSelector = useCallback(selectThemeMode, []);
  return useStateSelector(store, stableSelector);
}

/**
 * ダークモードかどうかを購読するhook
 */
export function useIsDarkMode() {
  const store = useThemeStore();
  const stableSelector = useCallback(selectIsDarkMode, []);
  return useStateSelector(store, stableSelector);
}

/**
 * 状態更新用のディスパッチャーを取得するhook
 */
export function useThemeStateDispatcher() {
  const store = useThemeStore();
  return useCallback(() => useStateUpdater(store), [store])();
}

/**
 * テーマモードを更新するhook
 */
export function useThemeModeUpdater() {
  const dispatcher = useThemeStateDispatcher();
  return useCallback((themeMode: ThemeMode) => {
    // LocalStorageに保存
    localStorage.setItem('themeMode', themeMode);
    
    // isDarkModeを計算
    let isDarkMode: boolean;
    if (themeMode === 'system') {
      isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDarkMode = themeMode === 'dark';
    }
    
    dispatcher({ themeMode, isDarkMode });
  }, [dispatcher]);
}

/**
 * システムテーマ変更を監視するhook
 */
export function useSystemThemeWatcher() {
  const themeMode = useThemeMode();
  const dispatcher = useThemeStateDispatcher();
  
  useEffect(() => {
    if (themeMode !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (themeMode === 'system') {
        dispatcher({ isDarkMode: e.matches });
      }
    };

    // 初期設定
    dispatcher({ isDarkMode: mediaQuery.matches });
    
    // リスナー追加
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [themeMode, dispatcher]);
}
