import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { Box, Container, Typography, ThemeProvider, CssBaseline, AppBar, Toolbar, Stack } from '@mui/material';
import { getApiEndpoint, fetchApiOptions, checkApiHealth, API_ENDPOINTS } from './lib/whisperApi';
import { preInitializeFFmpeg, getFFmpegInitializationStatus } from './lib/ffmpeg';
import { 
  useCreateAppState, 
  useApiStatus,
  useApiStatusUpdater, 
  useFFmpegPreInitStatusUpdater,
  useTemperatureSettings,
  useVadFilter,
  usePrompt,
  useHotwords
} from './store/useAppStore';
import { useCreateThemeState } from './store/useThemeStore';
import { useCreateTranscriptionState } from './store/useTranscriptionStore';
import { 
  useCreateApiOptionsState,
  useSelectedModel,
  useApiOptionsUpdater,
  useSelectedModelUpdater,
  useApiOptionsLoadingUpdater,
  useTranscriptionOptionsFromApiState
} from './store/useApiOptionsStore';
import ServerSettings from "./components/ServerSettings";
import { TranscriptionSettings } from './components/TranscriptionSettings';
import { FileUpload } from './components/FileUpload';
import ProcessingStatus from './components/ProcessingStatus';
import { TranscriptionResult } from './components/TranscriptionResult';
import { LanguageSelector } from './components/LanguageSelector';
import { ThemeSelector } from './components/ThemeSelector';
import ConfigErrorDisplay from './components/ConfigErrorDisplay';
import Logs from './components/Logs';
import { useTranslation } from 'react-i18next';
import { useTheme } from './hooks/useTheme';
import { useTranscription } from './hooks/useTranscription';
import { useConfig } from './hooks/useConfig';
import './i18n';

declare global {
  interface Window {
    lastCalculatedDuration?: number;
  }
}

const AppContent: React.FC = () => {
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

  // 設定を読み込み - 使用可能な値とエラーを取得
  const { config, loading, error, forceProxyDisabled } = useConfig();

  // API状態を購読
  const apiStatus = useApiStatus();

  // 設定変更トリガー用の状態
  const [lastConfigHash, setLastConfigHash] = useState('');

  // 状態管理ストアの初期化（再レンダリングなし）
  useCreateAppState();
  useCreateThemeState();
  useCreateTranscriptionState();
  useCreateApiOptionsState();

  // 状態更新用のディスパッチャー（再レンダリングなし）
  const updateApiStatus = useApiStatusUpdater();
  const updateApiOptions = useApiOptionsUpdater();
  const updateSelectedModel = useSelectedModelUpdater();
  const updateFFmpegPreInitStatus = useFFmpegPreInitStatusUpdater();
  const setApiOptionsLoading = useApiOptionsLoadingUpdater();

  // 必要な状態のみを購読（該当する状態が変更された時のみ再レンダリング）
  const selectedModel = useSelectedModel();
  
  // API設定を動的に生成（useConfigから）- useMemoで最適化
  const apiConfig = useMemo(() => ({
    baseUrl: config.useServerProxy ? '/whisper' : (config.whisperApiUrl || undefined),
    token: config.whisperApiToken || undefined,
    useServerProxy: config.useServerProxy
  }), [config.useServerProxy, config.whisperApiUrl, config.whisperApiToken]);
  
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

  // プロキシURLの取得
  const getProxyUrl = useCallback(() => {
    // プロキシが強制無効の場合や設定がオフの場合はapiUrlを使用
    if (forceProxyDisabled || !config.useServerProxy) {
      return config.whisperApiUrl || '';
    }
    return '/whisper'; // プロキシパス
  }, [config.useServerProxy, config.whisperApiUrl, forceProxyDisabled]);

  // APIオプションとステータスの取得（サーバー設定変更時のみ）
  const fetchApiData = useCallback(async () => {
    try {
      // ローディング開始
      setApiOptionsLoading(true);
      
      // 設定から適切なURLを取得
      const proxyUrl = getProxyUrl();
      const useProxyMode = !forceProxyDisabled && config.useServerProxy;
      const url = getApiEndpoint(proxyUrl, API_ENDPOINTS.OPTIONS, useProxyMode);
      
      // 認証有無に基づいてAPIオプションを取得
      const apiToken = config.whisperApiToken || undefined;
      const options = await fetchApiOptions(url, apiToken);
      
      // APIオプション更新（ローカルストレージとの照合も含む）
      updateApiOptions(options);
      
      // ヘルスチェック実行
      const healthStatus = await checkApiHealth(proxyUrl, apiToken);
      updateApiStatus(healthStatus);

      // ヘルスチェックが成功し、モデルが未選択の場合は最初のモデルを選択
      if (healthStatus.status === 'healthy' && !selectedModel && options.models.length > 0) {
        const firstModel = options.models[0];
        updateSelectedModel(firstModel.id);
      }
    } catch (error) {
      // エラー発生時はAPI状態を「エラー」に設定
      updateApiStatus({
        status: 'error',
        message: 'Connection to API server failed',
        details: error instanceof Error ? error.stack || error.message : String(error)
      });
      // 空のAPIオプションを設定
      updateApiOptions({ models: [], responseFormats: [], timestampGranularities: [], languages: [] });
    } finally {
      // ローディング終了
      setApiOptionsLoading(false);
    }
  }, [getProxyUrl, config.useServerProxy, config.whisperApiToken, updateApiStatus, updateApiOptions, updateSelectedModel, selectedModel, forceProxyDisabled, setApiOptionsLoading]);

  // 設定変更時にAPIフェッチをトリガーするためのハンドラー
  const handleServerSettingsChange = useCallback(() => {
    const newConfigHash = JSON.stringify({
      url: config.whisperApiUrl,
      token: config.whisperApiToken,
      proxy: config.useServerProxy
    });
    
    if (newConfigHash !== lastConfigHash) {
      setLastConfigHash(newConfigHash);
      if (config.whisperApiUrl || config.useServerProxy) {
        fetchApiData();
      }
    }
  }, [config.whisperApiUrl, config.whisperApiToken, config.useServerProxy, lastConfigHash, fetchApiData]);

  const handleLanguageChange = useCallback((language: string) => {
    i18n.changeLanguage(language);
  }, [i18n]);

  const handleFileSelect = useCallback(async (file: File) => {
    // モデルが選択されていない場合は処理しない
    if (!selectedModel) {
      return;
    }

    // 新しいファイル処理開始前に進捗をリセット
    resetProgress();
    
    // ファイル処理開始
    await processFile(file, transcriptionOptions, apiConfig);
  }, [selectedModel, resetProgress, processFile, transcriptionOptions, apiConfig]);

  // 初回マウント時のみAPIデータを取得
  useEffect(() => {
    // 必要な設定が揃っている場合のみAPIデータを取得
    if (apiConfig.baseUrl && !lastConfigHash) {
      const initialConfigHash = JSON.stringify({
        url: config.whisperApiUrl,
        token: config.whisperApiToken,
        proxy: config.useServerProxy
      });
      setLastConfigHash(initialConfigHash);
      fetchApiData();
    }
  }, [apiConfig.baseUrl, config.whisperApiUrl, config.whisperApiToken, config.useServerProxy, lastConfigHash, fetchApiData]);

  // FFmpegの事前初期化（ページ読み込み時に実行）
  useEffect(() => {
    const initializeFFmpeg = async () => {
      const status = getFFmpegInitializationStatus();
      
      // 既に初期化済みまたは初期化中の場合はスキップ
      if (status.isInitialized || status.isInitializing) {
        updateFFmpegPreInitStatus({
          isInitializing: status.isInitializing,
          isInitialized: status.isInitialized,
          initError: null
        });
        return;
      }

      updateFFmpegPreInitStatus({
        isInitializing: true,
        isInitialized: false,
        initError: null
      });

      try {
        await preInitializeFFmpeg(
          undefined, // onLog - ここではログを出力しない
          (message) => {
            // プログレスメッセージはコンソールに出力
            console.info(`[FFmpeg Pre-init] ${message}`);
          }
        );
        
        updateFFmpegPreInitStatus({
          isInitializing: false,
          isInitialized: true,
          initError: null
        });
      } catch (error) {
        console.warn('FFmpeg pre-initialization failed:', error);
        updateFFmpegPreInitStatus({
          isInitializing: false,
          isInitialized: false,
          initError: error instanceof Error ? error.message : String(error)
        });
      }
    };

    // ページ読み込み後に少し遅延してから初期化を開始
    // （他の重要な初期化処理を妨げないため）
    const timer = setTimeout(initializeFFmpeg, 500);
    
    return () => clearTimeout(timer);
  }, [updateFFmpegPreInitStatus]); // 初回マウント時のみ実行

  // 設定エラーがある場合の表示
  if (error.hasError) {
    return <ConfigErrorDisplay error={error} config={config} />;
  }

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
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {t('appDescription')}
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <ServerSettings 
            apiStatus={apiStatus}
            onSettingsChange={handleServerSettingsChange}
          />
        </Box>

        <Box sx={{ mb: 4 }}>
          <TranscriptionSettings />
        </Box>

        <Box sx={{ mb: 4 }}>
          <FileUpload onFileSelect={handleFileSelect} />
        </Box>

        {(processingState.isProcessing || processingState.currentStep || processingState.status || processingTime) && (
          <Box sx={{ mb: 4 }}>
            <ProcessingStatus
              isProcessing={processingState.isProcessing}
              progress={processingState.progress}
              status={processingState.status}
              currentStep={processingState.currentStep}
              stepProgress={processingState.stepProgress}
              currentChunk={processingState.currentChunk}
              totalChunks={processingState.totalChunks}
              processingTime={processingTime}
              isFFmpegInitializing={processingState.isFFmpegInitializing}
            />
          </Box>
        )}

        {(transcription.length > 0 || (processingState.isProcessing && originalFileName)) && (
          <Box sx={{ mb: 4 }}>
            <TranscriptionResult
              segments={transcription}
              onCopy={handleCopy}
              originalFileName={originalFileName}
            />
          </Box>
        )}

        <Box sx={{ mb: 4 }}>
          <Logs logs={logs} onClear={clearLogs} />
        </Box>
      </Container>
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  return <AppContent />;
};

export default App;
