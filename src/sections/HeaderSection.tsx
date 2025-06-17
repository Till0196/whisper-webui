import React, { memo, useMemo } from 'react';
import { AppBar, Toolbar, Typography, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { LanguageSelector, ThemeSelector, type ThemeMode } from '../components';

interface HeaderSectionProps {
  appTitle: string;
  themeMode: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onLanguageChange: (language: string) => void;
}

export const HeaderSection: React.FC<HeaderSectionProps> = memo((props) => {
  const {
    appTitle,
    themeMode,
    onThemeChange,
    onLanguageChange
  } = props;
  
  const { i18n } = useTranslation();

  // Toolbarのスタイルをメモ化
  const toolbarStyles = useMemo(() => ({
    title: { flexGrow: 1 },
    stack: { direction: 'row' as const, spacing: 2 }
  }), []);

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={toolbarStyles.title}>
          {appTitle}
        </Typography>
        <Stack {...toolbarStyles.stack}>
          <ThemeSelector
            currentTheme={themeMode}
            onThemeChange={onThemeChange}
          />
          <LanguageSelector
            currentLanguage={i18n.language}
            onLanguageChange={onLanguageChange}
          />
        </Stack>
      </Toolbar>
    </AppBar>
  );
});

HeaderSection.displayName = 'HeaderSection';
