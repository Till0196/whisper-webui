import { ThemeMode } from '../components/ThemeSelector';

// テーマ状態の型定義
export interface ThemeState {
  themeMode: ThemeMode;
  isDarkMode: boolean;
}

// 初期状態を生成する関数
export const createInitialThemeState = (): ThemeState => {
  const savedTheme = localStorage.getItem('themeMode') as ThemeMode;
  const themeMode = savedTheme || 'system';
  
  let isDarkMode: boolean;
  if (themeMode === 'system') {
    isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  } else {
    isDarkMode = themeMode === 'dark';
  }
  
  return {
    themeMode,
    isDarkMode
  };
};

// セレクター関数
export const selectThemeMode = (state: ThemeState) => state.themeMode;
export const selectIsDarkMode = (state: ThemeState) => state.isDarkMode;
