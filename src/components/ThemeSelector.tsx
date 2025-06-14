import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';
import { 
  LightMode as LightModeIcon, 
  DarkMode as DarkModeIcon, 
  SettingsBrightness as SystemIcon 
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeSelectorProps {
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentTheme,
  onThemeChange
}) => {
  const { t } = useTranslation();

  const themes = [
    { 
      value: 'light', 
      label: t('common.theme.light'), 
      icon: <LightModeIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
    },
    { 
      value: 'dark', 
      label: t('common.theme.dark'), 
      icon: <DarkModeIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
    },
    { 
      value: 'system', 
      label: t('common.theme.system'), 
      icon: <SystemIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
    }
  ];

  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl size="small" fullWidth>
        <InputLabel>{t('common.theme.label')}</InputLabel>
        <Select
          value={currentTheme}
          label={t('common.theme.label')}
          onChange={(e) => onThemeChange(e.target.value as ThemeMode)}
          renderValue={(value) => {
            const selectedTheme = themes.find(theme => theme.value === value);
            return (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {selectedTheme?.icon}
                {selectedTheme?.label}
              </Box>
            );
          }}
        >
          {themes.map((theme) => (
            <MenuItem 
              key={theme.value} 
              value={theme.value}
              sx={{ display: 'flex', alignItems: 'center' }}
            >
              {theme.icon}
              {theme.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}; 