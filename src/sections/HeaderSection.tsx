import React, { memo, useMemo, useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Stack, 
  IconButton, 
  Drawer, 
  useTheme,
  useMediaQuery,
  Box,
  Divider
} from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleMobileMenuClose = (event: {}, reason: "backdropClick" | "escapeKeyDown") => {
    // バックドロップクリックまたはEscキーの場合のみ閉じる
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      setMobileMenuOpen(false);
    }
  };

  const handleManualClose = () => {
    setMobileMenuOpen(false);
  };

  // Toolbarのスタイルをメモ化
  const toolbarStyles = useMemo(() => ({
    title: { flexGrow: 1 },
    stack: { direction: 'row' as const, spacing: 2 }
  }), []);

  const mobileMenuContent = useMemo(() => (
    <Box 
      sx={{ width: 300 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ヘッダー */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          設定
        </Typography>
        <IconButton onClick={handleManualClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      
      {/* メニューコンテンツ */}
      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
            テーマ設定
          </Typography>
          <ThemeSelector
            currentTheme={themeMode}
            onThemeChange={onThemeChange}
          />
        </Box>
        
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
            言語設定
          </Typography>
          <LanguageSelector
            currentLanguage={i18n.language}
            onLanguageChange={onLanguageChange}
          />
        </Box>
      </Box>
    </Box>
  ), [themeMode, onThemeChange, i18n.language, onLanguageChange, handleManualClose]);

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={toolbarStyles.title}>
          {appTitle}
        </Typography>
        
        {isMobile ? (
          <>
            <IconButton
              color="inherit"
              aria-label="menu"
              onClick={handleMobileMenuToggle}
              edge="end"
            >
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="right"
              open={mobileMenuOpen}
              onClose={handleMobileMenuClose}
            >
              {mobileMenuContent}
            </Drawer>
          </>
        ) : (
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
        )}
      </Toolbar>
    </AppBar>
  );
});

HeaderSection.displayName = 'HeaderSection';
