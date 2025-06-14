import React, { useEffect, useCallback } from 'react';
import { Box, Container, Typography, ThemeProvider, CssBaseline, AppBar, Toolbar, Stack } from '@mui/material';
import { getApiEndpoint, fetchApiOptions, checkApiHealth, API_ENDPOINTS } from './lib/whisperApi';
import { preInitializeFFmpeg, getFFmpegInitializationStatus } from './lib/ffmpeg';
import { 
  useCreateAppState, 
  useApiStatusUpdater, 
  useServerConfig,
  useApiConfig,
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
  useApiOptions,
  useSelectedModel,
  useApiOptionsUpdater,
  useSelectedModelUpdater,
  useApiOptionsLoadingUpdater,
  useUserSettings,
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
import { useCreateConfigState } from './store/useConfigStore';
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

  // 状態管理ストアの初期化（再レンダリングなし）
  useCreateAppState();
  useCreateThemeState();
  useCreateTranscriptionState();
  useCreateConfigState();
  useCreateApiOptionsState();

  // 状態更新用のディスパッチャー（再レンダリングなし）
  const updateApiStatus = useApiStatusUpdater();
  const updateApiOptions = useApiOptionsUpdater();
  const updateSelectedModel = useSelectedModelUpdater();
  const updateFFmpegPreInitStatus = useFFmpegPreInitStatusUpdater();
  const setApiOptionsLoading = useApiOptionsLoadingUpdater();

  // 必要な状態のみを購読（該当する状態が変更された時のみ再レンダリング）
  const serverConfig = useServerConfig();
  const selectedModel = useSelectedModel();
  const apiOptions = useApiOptions();
  const apiConfig = useApiConfig();
  
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
    if (forceProxyDisabled || !serverConfig.useServerProxy) {
      return serverConfig.apiUrl;
    }
    return '/whisper'; // プロキシパス
  }, [serverConfig, forceProxyDisabled]);

  // APIオプションとステータスの取得（サーバー設定変更時のみ）
  const fetchApiData = useCallback(async () => {
    try {
      // ローディング開始
      setApiOptionsLoading(true);
      
      // 設定から適切なURLを取得
      const proxyUrl = getProxyUrl();
      const useProxyMode = !forceProxyDisabled && serverConfig.useServerProxy;
      const url = getApiEndpoint(proxyUrl, API_ENDPOINTS.OPTIONS, useProxyMode);
      
      // 認証有無に基づいてAPIオプションを取得
      const options = await fetchApiOptions(url, serverConfig.useAuth ? serverConfig.apiToken : undefined);
      
      // APIオプション更新（ローカルストレージとの照合も含む）
      updateApiOptions(options);
      
      // ヘルスチェック実行
      const healthStatus = await checkApiHealth(proxyUrl, serverConfig.useAuth ? serverConfig.apiToken : undefined);
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
  }, [serverConfig, getProxyUrl, updateApiStatus, updateApiOptions, updateSelectedModel, selectedModel, forceProxyDisabled, setApiOptionsLoading]);

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

  // 初回マウント時とサーバー設定変更時のみAPIデータを取得
  useEffect(() => {
    fetchApiData();
  }, [fetchApiData]);

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
  
  // ロード中表示
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <Typography variant="h6">設定をロード中...</Typography>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

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
          <ServerSettings />
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
