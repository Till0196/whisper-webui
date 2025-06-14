import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  TextField,
  Paper
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { 
  useApiOptions,
  useSelectedModel,
  useSelectedModelUpdater,
  useSelectedLanguage,
  useSelectedLanguageUpdater,
  useSelectedTimestampGranularity,
  useSelectedTimestampGranularityUpdater
} from '../store/useApiOptionsStore';
import { 
  useTemperatureSettings,
  useTemperatureSettingsUpdater,
  usePrompt,
  usePromptUpdater,
  useHotwords,
  useHotwordsUpdater,
  useVadFilter,
  useVadFilterUpdater
} from '../store/useAppStore';

export const TranscriptionSettings: React.FC = () => {
  const { t } = useTranslation();
  
  // 状態を購読（変更時のみ再レンダリング）
  const apiOptions = useApiOptions();
  const selectedModel = useSelectedModel();
  const selectedLanguage = useSelectedLanguage();
  const selectedTimestampGranularity = useSelectedTimestampGranularity();
  const { useTemperature, temperature } = useTemperatureSettings();
  const prompt = usePrompt();
  const hotwords = useHotwords();
  const vadFilterEnabled = useVadFilter();
  
  // 状態更新用のディスパッチャー（再レンダリングなし）
  const setSelectedModel = useSelectedModelUpdater();
  const setSelectedLanguage = useSelectedLanguageUpdater();
  const setSelectedTimestampGranularity = useSelectedTimestampGranularityUpdater();
  const { setUseTemperature, setTemperature } = useTemperatureSettingsUpdater();
  const setPrompt = usePromptUpdater();
  const setHotwords = useHotwordsUpdater();
  const setUseVadFilter = useVadFilterUpdater();

  const handleHotwordsChange = (value: string) => {
    setHotwords(value.split(',').map(word => word.trim()).filter(word => word.length > 0));
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {t('transcriptionSettings.title')}
      </Typography>

      {/* メインオプション（モデル、言語、タイムスタンプ）をカラム表示 */}
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          mb: 3 
        }}
      >
        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth>
            <InputLabel>{t('transcriptionSettings.model.label')}</InputLabel>
            <Select
              value={selectedModel}
              label={t('transcriptionSettings.model.label')}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {apiOptions.models.map((model) => (
                <MenuItem key={model.id} value={model.id}>
                  {model.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth>
            <InputLabel>{t('transcriptionSettings.language.label')}</InputLabel>
            <Select
              value={selectedLanguage}
              label={t('transcriptionSettings.language.label')}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <MenuItem value="auto">{t('transcriptionSettings.language.auto')}</MenuItem>
              {apiOptions.languages.map((lang) => (
                <MenuItem key={lang} value={lang}>
                  {t(`languages.${lang}`, lang.toUpperCase())}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth>
            <InputLabel>{t('transcriptionSettings.timestampGranularity.label')}</InputLabel>
            <Select
              value={selectedTimestampGranularity}
              label={t('transcriptionSettings.timestampGranularity.label')}
              onChange={(e) => setSelectedTimestampGranularity(e.target.value)}
            >
              {apiOptions.timestampGranularities.map((granularity) => (
                <MenuItem key={granularity} value={granularity}>
                  {t(`transcriptionSettings.timestampGranularity.${granularity}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* トグルボタン群をカラム表示 */}
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          mb: 3 
        }}
      >
        <Box sx={{ flex: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={vadFilterEnabled}
                onChange={(e) => setUseVadFilter(e.target.checked)}
              />
            }
            label={t('transcriptionSettings.vadFilter.label')}
          />
        </Box>

        <Box sx={{ flex: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={useTemperature}
                onChange={(e) => setUseTemperature(e.target.checked)}
              />
            }
            label={t('transcriptionSettings.useTemperature')}
          />
        </Box>

        <Box sx={{ flex: 1 }}></Box> {/* 空のボックスでレイアウト調整 */}
      </Box>

      {/* 温度スライダー */}
      {useTemperature && (
        <Box sx={{ mb: 3, px: 2 }}>
          <Typography gutterBottom>{t('transcriptionSettings.temperature')}</Typography>
          <Slider
            value={temperature}
            onChange={(_, value) => setTemperature(value as number)}
            min={0}
            max={1}
            step={0.1}
            marks
            valueLabelDisplay="auto"
            sx={{ mt: 2 }}
          />
        </Box>
      )}

      {/* テキストフィールド */}
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3 
        }}
      >
        <Box sx={{ flex: 1 }}>
          <TextField
            fullWidth
            label={t('transcriptionSettings.prompt.label')}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            helperText={t('transcriptionSettings.prompt.help')}
            multiline
            rows={3}
          />
        </Box>

        <Box sx={{ flex: 1 }}>
          <TextField
            fullWidth
            label={t('transcriptionSettings.hotwords.label')}
            value={hotwords.join(', ')}
            onChange={(e) => handleHotwordsChange(e.target.value)}
            helperText={t('transcriptionSettings.hotwords.help')}
            multiline
            rows={3}
          />
        </Box>
      </Box>
    </Paper>
  );
}; 