import React from 'react';
import {
  Box,
  Container,
  Typography,
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  Stack,
  Alert,
  AlertTitle
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { LanguageSelector } from './LanguageSelector';
import { ThemeSelector } from './ThemeSelector';

/**
 * 設定エラーを表示するコンポーネント
 * このコンポーネントはconfig.jsが見つからない場合や
 * 設定が不完全な場合などにエラーを表示します
 */
interface ConfigErrorDisplayProps {
  error: {
    message: string;
    errorType: string | null;
  };
  config: {
    appTitle: string;
  };
}

const ConfigErrorDisplay: React.FC<ConfigErrorDisplayProps> = ({ error, config }) => {
  const { t, i18n } = useTranslation();
  const { theme, themeMode, handleThemeChange } = useTheme();

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {config.appTitle}
          </Typography>
          <Stack direction="row" spacing={2}>
            <ThemeSelector
              currentTheme={themeMode}
              onThemeChange={handleThemeChange}
            />
            <LanguageSelector
              currentLanguage={i18n.language}
              onLanguageChange={handleLanguageChange}
            />
          </Stack>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          <AlertTitle>{t('errors.configError.title')}</AlertTitle>
          {error.message}
          
          {error.errorType === 'no-config' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2">
                {t('errors.configError.createConfigFile')}
              </Typography>
              <Box component="pre" sx={{ 
                mt: 1, 
                p: 2, 
                bgcolor: 'grey.100', 
                borderRadius: 1,
                fontSize: '0.875rem',
                overflow: 'auto'
              }}>
{`window.APP_CONFIG = {
  WHISPER_API_URL: "http://localhost:9000",
  WHISPER_API_TOKEN: "",
  USE_SERVER_PROXY: "false",
  SERVER_PROXY_URL: "http://localhost:9000",
  APP_TITLE: "Whisper WebUI",
  HEALTH_CHECK_URL: "",
  ENVIRONMENT: "production",
  HIDE_CREDENTIALS: "false",
  ALLOW_CREDENTIAL_EDIT: "true"
};`}
              </Box>
            </Box>
          )}
        </Alert>
        
        <Typography variant="body1" color="text.secondary">
          {t('errors.configError.cannotStart')}
        </Typography>
      </Container>
    </ThemeProvider>
  );
};

export default ConfigErrorDisplay;
