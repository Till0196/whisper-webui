import React, { useEffect, useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onLanguageChange
}) => {
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  const languages = [
    { code: 'ja', name: '日本語' },
    { code: 'en', name: 'English' }
  ];

  useEffect(() => {
    // i18nが初期化された後に言語を設定
    if (i18n.isInitialized) {
      const detectedLang = i18n.language;
      const supportedLang = languages.find(lang => detectedLang.startsWith(lang.code))?.code || 'ja';
      setSelectedLanguage(supportedLang);
      if (supportedLang !== detectedLang) {
        i18n.changeLanguage(supportedLang);
      }
    }
  }, [i18n.isInitialized, i18n.language]);

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    onLanguageChange(language);
  };

  return (
    <Box sx={{ minWidth: 120 }}>
      <FormControl size="small" fullWidth>
        <InputLabel>{t('common.language')}</InputLabel>
        <Select
          value={selectedLanguage}
          label={t('common.language')}
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          {languages.map((lang) => (
            <MenuItem key={lang.code} value={lang.code}>
              {lang.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}; 