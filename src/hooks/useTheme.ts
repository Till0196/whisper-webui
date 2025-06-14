import { useMemo } from 'react';
import { createTheme, Theme } from '@mui/material/styles';
import { ThemeMode } from '../components/ThemeSelector';
import { 
  useThemeMode, 
  useIsDarkMode, 
  useThemeModeUpdater, 
  useSystemThemeWatcher 
} from '../store/useThemeStore';

export const useTheme = () => {
  // ストアから状態を購読
  const themeMode = useThemeMode();
  const isDarkMode = useIsDarkMode();
  
  // 状態更新用のディスパッチャー
  const setThemeMode = useThemeModeUpdater();
  
  // システムテーマ変更を監視
  useSystemThemeWatcher();

  const handleThemeChange = (newTheme: ThemeMode) => {
    setThemeMode(newTheme);
  };

  const theme: Theme = useMemo(() => createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      background: {
        default: isDarkMode ? '#121212' : '#fafafa',
        paper: isDarkMode ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#000000',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  }), [isDarkMode]);

  return {
    theme,
    themeMode,
    isDarkMode,
    handleThemeChange,
  };
}; 