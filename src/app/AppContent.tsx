// React & Core Dependencies
import React, { useMemo, useCallback } from 'react';
import { Box, Container, Typography, ThemeProvider, CssBaseline } from '@mui/material';

// Custom Hooks
import { useAppContentLogic } from '../hooks';

// UI Components & Sections
import { HeaderSection, SettingsSection, ProcessingSection } from '../sections';
import { ConfigErrorDisplay } from '../components';
import type { ThemeMode } from '../components';

// Initialize i18n (side effect import)
import '../i18n';

export const AppContent: React.FC = () => {
  const {
    // Theme & UI
    theme,
    themeMode,
    handleThemeChange,
    handleLanguageChange,
    
    // Config & Error
    config,
    error,
    
    // Transcription
    transcription,
    logs,
    processingTime,
    originalFileName,
    processingState,
    handleCopy,
    clearLogs,
    handleFileSelect,
    
    // API
    apiStatus,
    handleServerSettingsChange,
    
    // Translation
    t
  } = useAppContentLogic();

  // メモ化されたHeaderSectionのprops
  const headerSectionProps = useMemo(() => ({
    appTitle: config.appTitle,
    themeMode: themeMode as ThemeMode,
    onThemeChange: handleThemeChange,
    onLanguageChange: handleLanguageChange
  }), [config.appTitle, themeMode, handleThemeChange, handleLanguageChange]);

  // メモ化されたSettingsSectionのprops
  const settingsSectionProps = useMemo(() => ({
    apiStatus,
    onServerSettingsChange: handleServerSettingsChange
  }), [apiStatus, handleServerSettingsChange]);

  // メモ化されたProcessingSectionのprops
  const processingSectionProps = useMemo(() => ({
    onFileSelect: handleFileSelect,
    processingState,
    processingTime,
    transcription,
    originalFileName,
    onCopy: handleCopy,
    logs,
    onClearLogs: clearLogs
  }), [
    handleFileSelect,
    processingState,
    processingTime,
    transcription,
    originalFileName,
    handleCopy,
    logs,
    clearLogs
  ]);

  // スタイルのメモ化
  const containerStyles = useMemo(() => ({
    py: 4
  }), []);

  const subtitleStyles = useMemo(() => ({
    mb: 4
  }), []);

  // 設定エラーがある場合の表示
  if (error.hasError) {
    return <ConfigErrorDisplay error={error} config={config} />;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      <HeaderSection {...headerSectionProps} />

      <Container maxWidth="lg" sx={containerStyles}>
        <Box sx={subtitleStyles}>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {t('appDescription')}
          </Typography>
        </Box>

        <SettingsSection {...settingsSectionProps} />

        <ProcessingSection {...processingSectionProps} />
      </Container>
    </ThemeProvider>
  );
};
