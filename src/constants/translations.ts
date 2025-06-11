import { Language } from '../contexts/LanguageContext';

// 翻訳キーの型定義
export type TranslationKey = keyof typeof translations.ja;

// 翻訳データ
export const translations: Record<Language, Record<string, any>> = {
  'ja': {
    appTitle: 'Whisper WebUI',
    serverSettings: {
      title: 'サーバー設定',
      useAuth: '認証を使用',
      useHealthCheck: 'ヘルスチェックを使用',
      healthCheckUrl: {
        label: 'ヘルスチェックURL',
        placeholder: 'http://localhost:9000/health'
      },
      useCustomServer: 'カスタムサーバーを使用',
      useServerProxy: 'サーバープロキシを使用'
    },
    apiStatus: {
      healthy: 'Whisper APIステータス',
      message: {
        success: 'Whisper APIサーバーは正常に動作しています',
        error: 'Whisper APIサーバーに接続できません'
      },
      details: '詳細'
    },
    apiUrl: {
      label: 'WhisperサーバーのURL',
      placeholder: 'http://localhost:9000'
    },
    apiToken: {
      label: 'WhisperサーバーのAPIキー',
      placeholder: 'APIキーを入力してください'
    },
    model: {
      label: 'モデル',
      required: 'モデルを選択してください'
    },
    language: {
      label: '言語',
      auto: '自動検出'
    },
    timestampGranularity: {
      label: 'タイムスタンプの粒度',
      word: '単語単位',
      segment: 'セグメント単位'
    },
    vadFilter: {
      label: 'VADフィルターを使用'
    },
    temperature: {
      label: '温度パラメータを使用'
    },
    prompt: {
      label: 'プロンプト',
      placeholder: 'プロンプトを入力してください'
    },
    hotwords: {
      label: 'ホットワード',
      placeholder: 'カンマ区切りで入力してください'
    },
    upload: {
      default: 'ファイルをドラッグ＆ドロップするか、クリックして選択してください',
      dragActive: 'ファイルをドロップしてください'
    },
    processing: {
      initializingFFmpeg: 'FFmpegを初期化中...',
      loading: 'FFmpegを読み込み中...',
      converting: '音声を変換中...',
      splitting: '音声を分割中...',
      uploading: '音声をアップロード中...',
      transcribing: '文字起こし中...',
      remaining: '残り%{time}秒',
      complete: '処理が完了しました',
      error: '音声ファイルに変換できませんでした'
    },
    logs: {
      title: 'ログ',
      processingStart: '処理開始: %{startTime}\nファイル名: %{fileName}\nファイルサイズ: %{fileSize}バイト',
      processingComplete: '処理完了: %{endTime}\n処理時間: %{processingTime}秒\n総再生時間: %{totalDuration}秒',
      durationFound: 'FFmpegから総再生時間を取得: %{duration}秒',
      errors: {
        durationNotFound: 'FFmpegから総再生時間を取得できませんでした',
        httpError: 'HTTPエラーが発生しました（ステータス: %{status}）',
        responseNotReadable: 'レスポンスを読み取れませんでした',
        unknown: '不明なエラーが発生しました',
        modelNotSelected: 'モデルを選択してください'
      }
    },
    transcription: {
      title: '文字起こし結果',
      processingTime: '処理時間: %{time}秒',
      download: {
        vtt: 'VTT形式でダウンロード',
        srt: 'SRT形式でダウンロード',
        json: 'JSON形式でダウンロード',
        text: 'テキスト形式でダウンロード'
      }
    },
    common: {
      apply: '適用'
    }
  },
  'en': {
    appTitle: 'Whisper WebUI',
    serverSettings: {
      title: 'Server Settings',
      useAuth: 'Use Authentication',
      useHealthCheck: 'Use Health Check',
      healthCheckUrl: {
        label: 'Health Check URL',
        placeholder: 'http://localhost:9000/health'
      },
      useCustomServer: 'Use Custom Server',
      useServerProxy: 'Use Server Proxy'
    },
    apiStatus: {
      healthy: 'Whisper API Status',
      message: {
        success: 'Whisper API server is running normally',
        error: 'Cannot connect to Whisper API server'
      },
      details: 'Details'
    },
    apiUrl: {
      label: 'Whisper Server URL',
      placeholder: 'http://localhost:9000'
    },
    apiToken: {
      label: 'Whisper Server API Key',
      placeholder: 'Enter your API Key'
    },
    model: {
      label: 'Model',
      required: 'Please select a model'
    },
    language: {
      label: 'Language',
      auto: 'Auto Detect'
    },
    timestampGranularity: {
      label: 'Timestamp Granularity',
      word: 'Word Level',
      segment: 'Segment Level'
    },
    vadFilter: {
      label: 'Use VAD Filter'
    },
    temperature: {
      label: 'Use Temperature Parameter'
    },
    prompt: {
      label: 'Prompt',
      placeholder: 'Enter your prompt'
    },
    hotwords: {
      label: 'Hotwords',
      placeholder: 'Enter comma-separated values'
    },
    upload: {
      default: 'Drag & drop a file here, or click to select',
      dragActive: 'Drop the file here'
    },
    processing: {
      initializingFFmpeg: 'Initializing FFmpeg...',
      loading: 'Loading FFmpeg...',
      converting: 'Converting audio...',
      splitting: 'Splitting audio...',
      uploading: 'Uploading audio...',
      transcribing: 'Transcribing...',
      remaining: '%{time} seconds remaining',
      complete: 'Processing complete',
      error: 'Failed to load converted file'
    },
    logs: {
      title: 'Logs',
      processingStart: 'Processing started: %{startTime}\nFilename: %{fileName}\nFile size: %{fileSize} bytes',
      processingComplete: 'Processing completed: %{endTime}\nProcessing time: %{processingTime} seconds\nTotal duration: %{totalDuration} seconds',
      durationFound: 'Total duration obtained from FFmpeg: %{duration} seconds',
      errors: {
        durationNotFound: 'Could not obtain total duration from FFmpeg',
        httpError: 'HTTP error occurred (status: %{status})',
        responseNotReadable: 'Could not read response',
        unknown: 'An unknown error occurred',
        modelNotSelected: 'Please select a model'
      }
    },
    transcription: {
      title: 'Transcription Results',
      processingTime: 'Processing time: %{time} seconds',
      download: {
        vtt: 'Download as VTT',
        srt: 'Download as SRT',
        json: 'Download as JSON',
        text: 'Download as Text'
      }
    },
    common: {
      apply: 'Apply'
    }
  }
}; 