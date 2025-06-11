import React, { useState, useCallback, useEffect } from 'react';
import { Box, Container, Typography, Paper, Alert, ThemeProvider, createTheme, CssBaseline, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Button, Slider, FormControlLabel, LinearProgress, TextField, Switch, Collapse, CircularProgress, Chip, Stack } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { TranscriptionSegment, LogEntry, ApiStatus, ApiOptions } from './types';
import { checkApiHealth, fetchApiOptions, API_ENDPOINTS } from './api';
import { convertToWav, splitIntoChunks } from './utils/ffmpeg';
import { parseResponse, downloadTranscription, formatTime } from './utils/transcription';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { LANGUAGE_NAMES } from './constants/languages';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ButtonGroup from '@mui/material/ButtonGroup';
import Tooltip from '@mui/material/Tooltip';

declare global {
  interface Window {
    lastCalculatedDuration?: number;
  }
}

const AppContent: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [isProcessingComplete, setIsProcessingComplete] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [isFFmpegInitializing, setIsFFmpegInitializing] = useState<boolean>(false);
  const [hasFFmpegStarted, setHasFFmpegStarted] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ isHealthy: false, message: '', details: '' });
  const [apiOptions, setApiOptions] = useState<ApiOptions>({ models: [], responseFormats: [], timestampGranularities: [], languages: [] });
  const [selectedModel, setSelectedModel] = useState<string>(localStorage.getItem('selectedModel') || '');
  const [selectedLanguage, setSelectedLanguage] = useState<string>(localStorage.getItem('selectedLanguage') || 'auto');
  const [selectedTimestampGranularity, setSelectedTimestampGranularity] = useState<string>(localStorage.getItem('selectedTimestampGranularity') || 'segment');
  const [vadFilter, setVadFilter] = useState<boolean>(true);
  const [useTemperature, setUseTemperature] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [prompt, setPrompt] = useState<string>('');
  const [hotwords, setHotwords] = useState<string>('');
  const [hotwordInput, setHotwordInput] = useState<string>('');
  const [hotwordTags, setHotwordTags] = useState<string[]>([]);
  const [apiUrl, setApiUrl] = useState<string>(() => {
    const storedUrl = localStorage.getItem('apiUrl');
    return storedUrl || import.meta.env.VITE_WHISPER_API_URL || 'http://localhost:9000';
  });
  const [apiToken, setApiToken] = useState<string>(() => {
    const storedToken = localStorage.getItem('apiToken');
    return storedToken || import.meta.env.VITE_WHISPER_API_TOKEN || '';
  });
  const [useAuth, setUseAuth] = useState<boolean>(() => {
    const storedUseAuth = localStorage.getItem('useAuth');
    return storedUseAuth === 'true' || !!import.meta.env.VITE_WHISPER_API_TOKEN;
  });
  const [healthCheckUrl, setHealthCheckUrl] = useState<string>(() => {
    const storedUrl = localStorage.getItem('healthCheckUrl');
    return storedUrl || import.meta.env.VITE_HEALTH_CHECK_URL || '';
  });
  const [useHealthCheck, setUseHealthCheck] = useState<boolean>(() => {
    const storedUseHealthCheck = localStorage.getItem('useHealthCheck');
    return storedUseHealthCheck === 'true' || !!import.meta.env.VITE_HEALTH_CHECK_URL;
  });
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState<boolean>(false);
  const [tempApiUrl, setTempApiUrl] = useState<string>(apiUrl);
  const [tempApiToken, setTempApiToken] = useState<string>(apiToken);
  const [tempUseAuth, setTempUseAuth] = useState<boolean>(useAuth);
  const [tempHealthCheckUrl, setTempHealthCheckUrl] = useState<string>(healthCheckUrl);
  const [tempUseHealthCheck, setTempUseHealthCheck] = useState<boolean>(useHealthCheck);
  const [ffmpeg] = useState(() => new FFmpeg());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<string>('');
  const [stepProgress, setStepProgress] = useState<number>(0);
  const [currentChunk, setCurrentChunk] = useState<number>(0);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [lastEndTime, setLastEndTime] = useState<number>(0);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionStartTime, setTranscriptionStartTime] = useState<number>(0);
  const [lastProcessingTime, setLastProcessingTime] = useState<number>(0);
  const [hasEnteredTranscriptionMode, setHasEnteredTranscriptionMode] = useState<boolean>(false);
  const [useServerProxy, setUseServerProxy] = useState<boolean>(() => {
    return import.meta.env.VITE_USE_SERVER_PROXY === 'true';
  });

  // 処理時間の更新用のエフェクト
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isProcessing && !isProcessingComplete) {
      const startTimeValue = startTime;
      timer = setInterval(() => {
        const currentTime = Date.now();
        const elapsedTime = (currentTime - startTimeValue) / 1000;
        setProcessingTime(elapsedTime);
        setLastProcessingTime(elapsedTime);
      }, 100);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isProcessing, isProcessingComplete, startTime, lastProcessingTime]);

  // APIのエンドポイントを取得する関数
  const getApiEndpoint = (endpoint: string) => {
    if (useServerProxy) {
      // プロキシモードの場合、/whisperをプレフィックスとして使用
      return `/whisper${endpoint}`;
    }
    // 直接アクセスの場合、API URLとエンドポイントを結合
    return `${apiUrl}${endpoint}`;
  };

  // ヘルスチェック用のURLを取得する関数
  const getHealthCheckUrl = () => {
    if (useServerProxy) {
      return import.meta.env.VITE_WHISPER_HEALTH_CHECK_URL || '/whisper/health';
    }
    return healthCheckUrl || apiUrl;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // モデルが選択されていない場合はエラー
    if (!selectedModel) {
      setLogs(prev => [...prev, {
        type: 'error',
        message: t('errors.modelNotSelected')
      }]);
      return;
    }

    // 前回の処理の完了・エラー状態をリセット
    setCurrentStep('');
    setIsProcessingComplete(false);
    setStatus('');

    const file = acceptedFiles[0];
    setOriginalFileName(file.name.replace(/\.[^/.]+$/, '')); // 拡張子を除いたファイル名
    setIsProcessing(true);
    setProgress(0);
    setStepProgress(0);
    setLogs([]);
    setTranscription([]);
    setProcessingTime(0);
    setLastProcessingTime(0);
    const now = Date.now();
    setStartTime(now);
    setCurrentChunk(0);
    setTotalChunks(0);
    setLastEndTime(0);
    setIsTranscribing(false);
    setTranscriptionStartTime(0);
    setTotalDuration(0);
    setHasEnteredTranscriptionMode(false);
    setIsFFmpegInitializing(true);
    setHasFFmpegStarted(false);
    let ffmpegStartTime = 0;
    let ffmpegEndTime = 0;

    // デバッグ情報をログに追加
    setLogs(prev => [...prev, {
      type: 'info',
      message: t('logs.processingStart', {
        startTime: new Date(now).toISOString(),
        fileName: file.name,
        fileSize: file.size
      })
    }]);

    try {
      await ffmpeg.load();
      ffmpegStartTime = Date.now();
      setStartTime(ffmpegStartTime); // 処理開始時間をFFmpegの処理開始時間に更新

      setCurrentStep('converting');
      setStatus('converting');
      let hasStartedProgress = false;
      let durationFound = false;
      const wavData = await convertToWav(file, ffmpeg, (progress) => {
        // FFmpegの進捗が始まるまでは進捗を0のままにする
        if (progress > 0) {
          if (!hasFFmpegStarted) {
            setIsFFmpegInitializing(false);
            setHasFFmpegStarted(true);
          }
          hasStartedProgress = true;
          setStepProgress(progress);
          setStatus(t('processing.converting') + ` (${progress.toFixed(1)}%)`);
        }
      }, (log) => {
        // FFmpegのログのみを表示（重複を防ぐため、同じメッセージが連続しないようにする）
        if (log.type === 'info') {
          setLogs(prev => {
            const lastLog = prev[prev.length - 1];
            if (lastLog && lastLog.message === log.message) {
              return prev;
            }
            return [...prev, log];
          });
        }
        // FFmpegのログから総再生時間を取得
        if (log.message.includes('Duration:')) {
          // より柔軟な正規表現パターン
          const durationMatch = log.message.match(/Duration:\s*(\d+):(\d+):(\d+)(?:\.(\d+))?/);
          if (durationMatch) {
            const [, hours, minutes, seconds, centiseconds] = durationMatch.map(Number);
            // 時間を秒に変換（centisecondsがない場合は0として扱う）
            const newDuration = (hours * 3600) + (minutes * 60) + seconds + ((centiseconds || 0) / 100);
            // 総再生時間を即座に更新
            window.lastCalculatedDuration = newDuration;
            setTotalDuration(window.lastCalculatedDuration);
            durationFound = true;
            // デバッグ情報をログに追加（重複を防ぐため、同じメッセージが連続しないようにする）
            setLogs(prev => {
              const lastLog = prev[prev.length - 1];
              if (lastLog && lastLog.message === t('logs.durationFound', { duration: newDuration.toFixed(2) })) {
                return prev;
              }
              return [...prev, {
                type: 'debug',
                message: t('logs.durationFound', { duration: newDuration.toFixed(2) })
              }];
            });
          }
        }
      });
      ffmpegEndTime = Date.now();

      // 総再生時間が取得できていない場合はエラー
      if (!durationFound) {
        setLogs(prev => [...prev, {
          type: 'error',
          message: t('logs.errors.durationNotFound')
        }]);
        throw new Error(t('logs.errors.durationNotFound'));
      }

      setCurrentStep('splitting');
      setStepProgress(0);
      setStatus('splitting');
      const chunks = splitIntoChunks(wavData);
      setTotalChunks(chunks.length);
      setStepProgress(100);

      setCurrentStep('uploading');
      setStepProgress(0);
      setStatus('uploading');

      for (const chunk of chunks) {
        const formData = new FormData();
        formData.append('file', new Blob([chunk], { type: 'audio/wav' }));
        formData.append('model', selectedModel);
        formData.append('language', selectedLanguage);
        formData.append('timestamp_granularities', selectedTimestampGranularity);
        formData.append('vad_filter', vadFilter.toString());
        formData.append('response_format', 'vtt');
        formData.append('stream', 'true');
        if (prompt) formData.append('prompt', prompt);
        if (hotwords) formData.append('hotwords', hotwords);
        if (useTemperature) formData.append('temperature', temperature.toString());

        const response = await fetch(`${getApiEndpoint(API_ENDPOINTS.TRANSCRIBE)}`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            ...(apiToken && { 'Authorization': `Bearer ${apiToken}` })
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.detail || t('errors.httpError', { status: response.status }));
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error(t('errors.responseNotReadable'));
        }

        let result = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = new TextDecoder().decode(value);
          result += text;

          // リアルタイムで結果を表示
          if (text.includes('-->')) {
            const segments = parseResponse(result);
            if (segments.length > 0) {
              // 最初のセグメントが到着したら文字起こしモードに切り替え
              if (!isTranscribing && !hasEnteredTranscriptionMode && segments.length > 0) {
                // 総再生時間を設定（window.lastCalculatedDurationを優先）
                const duration = window.lastCalculatedDuration || segments[0].end * 10;
                setTotalDuration(duration);

                // 文字起こしモードに切り替え
                setIsTranscribing(true);
                setHasEnteredTranscriptionMode(true);
                setCurrentStep('transcribing');
                setStepProgress(0);
                setStatus('transcribing');
                setTranscriptionStartTime(Date.now());
              }

              // 最後のセグメントの終了時間を取得
              const lastSegment = segments[segments.length - 1];

              // lastEndTimeの更新を先に行う（異常値を防ぐ）
              if (lastSegment.end > lastEndTime) {
                // 前回の終了時間を更新
                const newLastEndTime = lastSegment.end;
                setLastEndTime(newLastEndTime);
                
                // 進捗を計算（最後のセグメントの終了時間 / window.lastCalculatedDuration）
                const transcriptionProgress = Math.min(100, (newLastEndTime / (window.lastCalculatedDuration || totalDuration)) * 100);
                setStepProgress(transcriptionProgress);

                // 進捗が0より大きい場合のみ表示
                if (transcriptionProgress > 0) {
                  setStatus(t('processing.transcribing') + ` (${transcriptionProgress.toFixed(1)}%)`);
                }
              }

              // 文字起こしが完了したかチェック（最後のセグメントの終了時間が総再生時間の95%以上の場合）
              if (lastSegment.end >= (window.lastCalculatedDuration || totalDuration) * 0.95) {
                setStepProgress(100);
                setStatus(t('processing.transcribing') + ' (100.0%)');
              }

              setTranscription(prev => {
                const newSegments = segments.filter(seg => 
                  !prev.some(p => p.start === seg.start && p.end === seg.end)
                );
                return [...prev, ...newSegments];
              });
            }
          }
        }

        setCurrentChunk(prev => prev + 1);
        // 文字起こしが始まっていない場合のみアップロード進捗を表示
        if (!isTranscribing) {
          const uploadProgress = (currentChunk / totalChunks) * 100;
          setStepProgress(uploadProgress);
          if (uploadProgress > 0) {
            setStatus(t('processing.uploading') + ` (${uploadProgress.toFixed(1)}%)`);
          }
        }
      }

      const endTime = Date.now();
      const ffmpegProcessingTime = (ffmpegEndTime - ffmpegStartTime) / 1000; // FFmpegの処理時間（秒）
      const totalProcessingTime = (endTime - ffmpegStartTime) / 1000; // 全体の処理時間（秒）
      setProcessingTime(totalProcessingTime);
      setLastProcessingTime(totalProcessingTime);
      setIsProcessingComplete(true);
      setCurrentStep('complete');
      setStepProgress(100);
      setStatus('complete');
      // 最終的なデバッグ情報をログに追加
      setLogs(prev => [...prev, {
        type: 'info',
        message: t('logs.processingComplete', {
          processingTime: totalProcessingTime.toFixed(1),
          startTime: new Date(ffmpegStartTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          totalDuration: (window.lastCalculatedDuration || 0).toFixed(1)
        })
      }]);
    } catch (error: unknown) {
      setStatus('error');
      if (error instanceof Error) {
        const errorMessage = error.message;
        // エラーメッセージが翻訳キーの場合は、そのまま表示
        if (typeof errorMessage === 'string' && errorMessage.startsWith('errors.')) {
          setLogs(prev => [...prev, { type: 'error', message: t(errorMessage) }]);
        } else {
          // それ以外のエラーメッセージは、そのまま表示
          setLogs(prev => [...prev, { type: 'error', message: errorMessage }]);
        }
      } else {
        setLogs(prev => [...prev, { type: 'error', message: t('errors.unknown') }]);
      }
      setCurrentStep('error');
      setIsProcessingComplete(true);
    } finally {
      setIsProcessing(false);
    }
  }, [ffmpeg, selectedModel, selectedLanguage, selectedTimestampGranularity, vadFilter, prompt, hotwords, useTemperature, temperature, apiUrl, apiToken, t, logs, currentChunk, totalChunks, lastEndTime, isTranscribing, transcriptionStartTime, lastProcessingTime]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
    },
  });

  // システムのダークモード設定の変更を監視
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // 定期的なヘルスチェック
  useEffect(() => {
    const checkHealth = async () => {
      if (!useHealthCheck) {
        setApiStatus({ isHealthy: true, message: '', details: '' });
        return;
      }
      const url = getHealthCheckUrl();
      const status = await checkApiHealth(url, useAuth ? apiToken : undefined);
      setApiStatus(status);
    };
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [apiUrl, apiToken, useAuth, healthCheckUrl, useHealthCheck, useServerProxy]);

  // APIオプションの初期取得（初回のみ）
  useEffect(() => {
    if (apiOptions.models.length === 0) {
      const url = getApiEndpoint(API_ENDPOINTS.OPTIONS);
      fetchApiOptions(url, apiToken).then(setApiOptions);
    }
  }, [apiUrl, apiToken, apiOptions.models.length, useServerProxy]);

  const handleModelChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setSelectedModel(value);
    localStorage.setItem('selectedModel', value);
  };

  const handleTimestampGranularityChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setSelectedTimestampGranularity(value);
    localStorage.setItem('selectedTimestampGranularity', value);
  };

  const handleVadFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVadFilter(event.target.checked);
  };

  const handlePromptChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(event.target.value);
  };

  const handleHotwordInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setHotwordInput(value);

    // カンマが入力された場合、タグを追加
    if (value.includes(',')) {
      const tags = value.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag && !hotwordTags.includes(tag));
      
      if (tags.length > 0) {
        const newTags = [...hotwordTags, ...tags];
        setHotwordTags(newTags);
        setHotwords(newTags.join(','));
      }
      setHotwordInput('');
    }
  };

  const handleHotwordInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && hotwordInput.trim()) {
      event.preventDefault();
      const newTag = hotwordInput.trim();
      if (!hotwordTags.includes(newTag)) {
        const newTags = [...hotwordTags, newTag];
        setHotwordTags(newTags);
        setHotwords(newTags.join(','));
      }
      setHotwordInput('');
    }
  };

  const handleDeleteHotword = (tagToDelete: string) => {
    const newTags = hotwordTags.filter(tag => tag !== tagToDelete);
    setHotwordTags(newTags);
    setHotwords(newTags.join(','));
  };

  const handleTempApiUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempApiUrl(event.target.value);
  };

  const handleTempApiTokenChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempApiToken(event.target.value);
  };

  const handleTempUseAuthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempUseAuth(event.target.checked);
  };

  const handleTempHealthCheckUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempHealthCheckUrl(event.target.value);
  };

  const handleTempUseHealthCheckChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempUseHealthCheck(event.target.checked);
  };

  const handleApplySettings = () => {
    // API設定を保存
    localStorage.setItem('apiUrl', tempApiUrl);
    localStorage.setItem('apiToken', tempApiToken);
    localStorage.setItem('useAuth', tempUseAuth.toString());
    localStorage.setItem('useHealthCheck', tempUseHealthCheck.toString());
    localStorage.setItem('healthCheckUrl', tempHealthCheckUrl);

    // 設定を反映
    setApiUrl(tempApiUrl);
    setApiToken(tempApiToken);
    setUseAuth(tempUseAuth);
    setUseHealthCheck(tempUseHealthCheck);
    setHealthCheckUrl(tempHealthCheckUrl);
  };

  const handleToggleProxy = () => {
    setUseServerProxy(!useServerProxy);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth={false} sx={{ py: 4 }}>
        <Container maxWidth="md" sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {t('appTitle')}
          </Typography>
          <FormControl sx={{ minWidth: 120 }}>
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'ja' | 'en')}
              size="small"
            >
              <MenuItem value="ja">日本語</MenuItem>
              <MenuItem value="en">English</MenuItem>
            </Select>
          </FormControl>
        </Container>

        <Container maxWidth="md" sx={{ mb: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Button
                onClick={() => setIsServerSettingsOpen(!isServerSettingsOpen)}
                startIcon={isServerSettingsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              >
                {t('serverSettings.title')}
              </Button>
              {import.meta.env.VITE_USE_SERVER_PROXY === 'true' && (
                <Button
                  onClick={handleToggleProxy}
                  variant="outlined"
                  size="small"
                  sx={{ ml: 2 }}
                >
                  {useServerProxy ? t('serverSettings.useCustomServer') : t('serverSettings.useServerProxy')}
                </Button>
              )}
            </Box>
            <Collapse in={isServerSettingsOpen}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                {!useServerProxy && (
                  <>
                    <TextField
                      label={t('apiUrl.label')}
                      value={tempApiUrl}
                      onChange={handleTempApiUrlChange}
                      placeholder={t('apiUrl.placeholder')}
                      fullWidth
                    />
                    <Box sx={{ pl: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={tempUseAuth}
                            onChange={handleTempUseAuthChange}
                          />
                        }
                        label={t('serverSettings.useAuth')}
                      />
                    </Box>
                    {tempUseAuth && (
                      <TextField
                        label={t('apiToken.label')}
                        value={tempApiToken}
                        onChange={handleTempApiTokenChange}
                        placeholder={t('apiToken.placeholder')}
                        type="password"
                        fullWidth
                      />
                    )}
                  </>
                )}
                <Box sx={{ pl: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={tempUseHealthCheck}
                        onChange={handleTempUseHealthCheckChange}
                      />
                    }
                    label={t('serverSettings.useHealthCheck')}
                  />
                </Box>
                {tempUseHealthCheck && (
                  <TextField
                    label={t('serverSettings.healthCheckUrl.label')}
                    value={tempHealthCheckUrl}
                    onChange={handleTempHealthCheckUrlChange}
                    placeholder={t('serverSettings.healthCheckUrl.placeholder')}
                    fullWidth
                  />
                )}
                <Button
                  variant="contained"
                  onClick={handleApplySettings}
                  sx={{ alignSelf: 'flex-end', mt: 1 }}
                >
                  {t('common.apply')}
                </Button>
              </Box>
            </Collapse>
          </Paper>
        </Container>

        {useHealthCheck && (
          <Container maxWidth="md" sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              {t('apiStatus.healthy')}
            </Typography>
            <Alert 
              severity={apiStatus.isHealthy ? "success" : "error"}
              sx={{ mb: 2 }}
            >
              {apiStatus.isHealthy ? t('apiStatus.message.success') : t('apiStatus.message.error')}
              {apiStatus.details && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {t('apiStatus.details')}: {apiStatus.details}
                </Typography>
              )}
            </Alert>
          </Container>
        )}

        <Container maxWidth="md" sx={{ mb: 4 }}>
          <Box sx={{ 
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            '& > *': {
              flex: { xs: '1 1 100%', md: '1 1 0' }
            }
          }}>
            <FormControl fullWidth>
              <InputLabel>{t('model.label')}</InputLabel>
              <Select
                value={selectedModel}
                onChange={handleModelChange}
                label={t('model.label')}
                required
                error={!selectedModel}
              >
                {apiOptions?.models.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.id}
                  </MenuItem>
                ))}
              </Select>
              {!selectedModel && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  {t('model.required')}
                </Typography>
              )}
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="language-select-label">{t('language.label')}</InputLabel>
              <Select
                labelId="language-select-label"
                value={selectedLanguage}
                label={t('language.label')}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedLanguage(value);
                  localStorage.setItem('selectedLanguage', value);
                }}
              >
                <MenuItem value="auto">{t('language.auto')}</MenuItem>
                {apiOptions.languages.map((lang) => (
                  <MenuItem key={lang} value={lang}>
                    {LANGUAGE_NAMES[language][lang] || lang}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>{t('timestampGranularity.label')}</InputLabel>
              <Select
                value={selectedTimestampGranularity}
                onChange={handleTimestampGranularityChange}
                label={t('timestampGranularity.label')}
              >
                <MenuItem value="word">{t('timestampGranularity.word')}</MenuItem>
                <MenuItem value="segment">{t('timestampGranularity.segment')}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            <FormControl fullWidth>
              <FormControlLabel
                control={
                  <Switch
                    checked={vadFilter}
                    onChange={handleVadFilterChange}
                  />
                }
                label={t('vadFilter.label')}
              />
            </FormControl>

            <FormControl fullWidth>
              <FormControlLabel
                control={
                  <Switch
                    checked={useTemperature}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUseTemperature(e.target.checked)}
                  />
                }
                label={t('temperature.label')}
              />
              {useTemperature && (
                <Slider
                  value={temperature}
                  onChange={(_: Event, value: number | number[]) => setTemperature(value as number)}
                  min={0}
                  max={2}
                  step={0.1}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 1, label: '1' },
                    { value: 2, label: '2' }
                  ]}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value: number) => value.toFixed(1)}
                  aria-label="温度"
                />
              )}
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label={t('prompt.label')}
              value={prompt}
              onChange={handlePromptChange}
              placeholder={t('prompt.placeholder')}
            />

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('hotwords.label')}
              </Typography>
              <Box sx={{ mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  value={hotwordInput}
                  onChange={handleHotwordInputChange}
                  onKeyDown={handleHotwordInputKeyDown}
                  placeholder={t('hotwords.placeholder')}
                />
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {hotwordTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleDeleteHotword(tag)}
                    sx={{ m: 0.5 }}
                  />
                ))}
              </Stack>
            </Box>
          </Box>
        </Container>

        <Container maxWidth="md" sx={{ mb: 4 }}>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 1,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'background.paper',
            }}
          >
            <input {...getInputProps()} />
            <Typography>
              {isDragActive ? t('upload.dragActive') : t('upload.default')}
            </Typography>
          </Box>
        </Container>

        {isProcessing && (
          <Container maxWidth="md" sx={{ mb: 4 }}>
            {currentStep === 'uploading' ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">
                  {t('processing.uploading')}
                </Typography>
              </Box>
            ) : (
              <>
                {currentStep && (
                  <LinearProgress 
                    variant="determinate" 
                    value={stepProgress} 
                    color={currentStep === 'error' ? 'error' : 'primary'}
                  />
                )}
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  {isFFmpegInitializing && (
                    <>
                      <CircularProgress size={16} />
                      {t('processing.initializingFFmpeg')}
                    </>
                  )}
                  {!isFFmpegInitializing && currentStep === 'converting' && t('processing.converting') + ` (${stepProgress.toFixed(1)}%)`}
                  {currentStep === 'splitting' && t('processing.splitting')}
                  {currentStep === 'transcribing' && t('processing.transcribing') + ` (${stepProgress.toFixed(1)}%)`}
                  {currentStep === 'complete' && (
                    <>
                      <CheckCircleIcon color="success" />
                      {t('processing.complete')}
                    </>
                  )}
                  {currentStep === 'error' && (
                    <>
                      <ErrorIcon color="error" />
                      {t('processing.error')}
                    </>
                  )}
                </Typography>
              </>
            )}
          </Container>
        )}

        {isProcessingComplete && !isProcessing && currentStep && (
          <Container maxWidth="md" sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {currentStep === 'error' ? (
                <>
                  <ErrorIcon color="error" />
                  <Typography variant="body2" color="text.secondary">
                    {t('processing.error')}
                  </Typography>
                </>
              ) : (
                <>
                  <CheckCircleIcon color="success" />
                  <Typography variant="body2" color="text.secondary">
                    {t('processing.complete')}
                  </Typography>
                </>
              )}
            </Box>
          </Container>
        )}

        {logs.length > 0 && (
          <Container maxWidth="md" sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              {t('logs.title')}
            </Typography>
            <Paper sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
              {logs.map((log, index) => (
                <Typography 
                  key={index} 
                  variant="body2" 
                  component="pre" 
                  sx={{ 
                    whiteSpace: 'pre-wrap',       /* CSS3 */
                    wordWrap: 'break-word',       /* Internet Explorer 5.5+ */
                    wordBreak: 'break-all',
                    fontFamily: 'monospace'
                  }}
                >
                  {log.message}
                </Typography>
              ))}
            </Paper>
          </Container>
        )}

        {transcription.length > 0 && (
          <Container maxWidth="md">
            <Typography variant="h6" gutterBottom>
              {t('transcription.title')}
            </Typography>
            {processingTime !== null && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('transcription.processingTime', { time: (processingTime).toFixed(1) })}
              </Typography>
            )}
            <Box sx={{ mb: 2 }}>
              <ButtonGroup variant="contained" aria-label="transcription download options">
                <Tooltip title={t('transcription.download.vtt')}>
                  <Button
                    onClick={() => downloadTranscription(transcription, 'vtt', originalFileName)}
                    startIcon={<DownloadIcon />}
                  >
                    VTT
                  </Button>
                </Tooltip>
                <Tooltip title={t('transcription.download.srt')}>
                  <Button
                    onClick={() => downloadTranscription(transcription, 'srt', originalFileName)}
                    startIcon={<DownloadIcon />}
                  >
                    SRT
                  </Button>
                </Tooltip>
                <Tooltip title={t('transcription.download.json')}>
                  <Button
                    onClick={() => downloadTranscription(transcription, 'json', originalFileName)}
                    startIcon={<DownloadIcon />}
                  >
                    JSON
                  </Button>
                </Tooltip>
                <Tooltip title={t('transcription.download.text')}>
                  <Button
                    onClick={() => downloadTranscription(transcription, 'text', originalFileName)}
                    startIcon={<DownloadIcon />}
                  >
                    TXT
                  </Button>
                </Tooltip>
              </ButtonGroup>
            </Box>
            <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
              {transcription.map((segment, index) => (
                <Typography key={index} variant="body1" paragraph>
                  <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.875rem', mr: 1 }}>
                    [{formatTime(segment.start)} - {formatTime(segment.end)}]
                  </Box>
                  {segment.text}
                </Typography>
              ))}
            </Paper>
          </Container>
        )}
      </Container>
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App; 