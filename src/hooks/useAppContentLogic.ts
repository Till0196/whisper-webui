import { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Custom Hooks
import { 
  useTheme, 
  useTranscription, 
  useConfig, 
  useApiData, 
  useFFmpegInitialization 
} from './index';

// State Management
import {
  useCreateAppState,
  useCreateThemeState,
  useCreateTranscriptionState,
  useCreateApiOptionsState,
  useSelectedModel,
  useTemperatureSettings,
  useVadFilter,
  usePrompt,
  useHotwords,
  useTranscriptionOptionsFromApiState
} from '../store';

/**
 * AppContentコンポーネントの主要ロジックを管理するカスタムフック
 * 状態管理、イベントハンドラー、副作用を集約
 */
export const useAppContentLogic = () => {
  const { t, i18n } = useTranslation();
  const { theme, themeMode, handleThemeChange } = useTheme();
  const {
    transcription,
    logs,
    processingTime,
    originalFileName,
    processingState,
    processFile,
    handleCopy,
    clearLogs,
    resetProgress
  } = useTranscription(t);

  // 設定を読み込み
  const { config, error } = useConfig();

  // API関連のロジック
  const { 
    apiStatus, 
    apiConfig, 
    lastConfigHash, 
    setLastConfigHash, 
    fetchApiData, 
    handleServerSettingsChange 
  } = useApiData();

  // FFmpeg初期化
  useFFmpegInitialization();

  // 状態管理ストアの初期化
  useCreateAppState();
  useCreateThemeState();
  useCreateTranscriptionState();
  useCreateApiOptionsState();

  // 必要な状態のみを購読
  const selectedModel = useSelectedModel();
  
  // アプリ設定を取得
  const temperatureSettings = useTemperatureSettings();
  const vadFilter = useVadFilter();
  const prompt = usePrompt();
  const hotwords = useHotwords();
  
  // TranscriptionOptionsを動的に生成
  const transcriptionOptions = useTranscriptionOptionsFromApiState({
    useTemperature: temperatureSettings.useTemperature,
    temperature: temperatureSettings.temperature,
    useVadFilter: vadFilter,
    prompt,
    hotwords
  });

  // 言語変更ハンドラー
  const handleLanguageChange = useCallback((language: string) => {
    i18n.changeLanguage(language);
  }, [i18n]);

  // ファイル選択ハンドラー
  const handleFileSelect = useCallback(async (file: File) => {
    if (!selectedModel) {
      return;
    }

    resetProgress();
    await processFile(file, transcriptionOptions, apiConfig);
  }, [selectedModel, resetProgress, processFile, transcriptionOptions, apiConfig]);

  // 初回マウント時のAPIデータ取得
  useEffect(() => {
    if (apiConfig.baseUrl && !lastConfigHash) {
      const initialConfigHash = JSON.stringify({
        url: config.whisperApiUrl,
        token: config.whisperApiToken,
        proxy: config.useServerProxy
      });
      setLastConfigHash(initialConfigHash);
      fetchApiData();
    }
  }, [apiConfig.baseUrl, config.whisperApiUrl, config.whisperApiToken, config.useServerProxy, lastConfigHash, fetchApiData, setLastConfigHash]);

  return {
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
  };
};
