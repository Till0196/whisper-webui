import { ApiStatus, ApiOptions } from '../types';

export const API_ENDPOINTS = {
  OPTIONS: '/v1/models',
  TRANSCRIBE: '/v1/audio/transcriptions',
  TRANSLATE: '/v1/audio/translations',
  SPEECH: '/v1/audio/speech',
  SPEECH_TIMESTAMPS: '/v1/audio/speech/timestamps',
  REALTIME: '/v1/realtime'
} as const;

export const checkApiHealth = async (url: string, token?: string): Promise<ApiStatus> => {
  try {
    const response = await fetch(url, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      return {
        isHealthy: false,
        message: `HTTP error! status: ${response.status}`,
        details: `${response.statusText}\n${errorBody}`
      };
    }

    const body = await response.text().catch(() => '');
    return {
      isHealthy: true,
      message: 'API is healthy',
      details: body
    };

  } catch (error) {
    return {
      isHealthy: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack || '' : ''
    };
  }
};

export const fetchApiOptions = async (url: string, token?: string): Promise<ApiOptions> => {
  const response = await fetch(url, {
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  
  // モデル情報を取得
  const models = data.data.map((model: any) => ({
    id: model.id,
    task: model.task,
    language: model.language?.[0] || 'auto'
  }));

  // 言語リストを取得（重複を除去）
  const languages = Array.from(new Set(
    data.data
      .filter((model: any) => model.language)
      .flatMap((model: any) => model.language as string[])
  )) as string[];

  // OpenAPIの仕様に基づいて固定値を設定
  const responseFormats = ['text', 'json', 'verbose_json', 'srt', 'vtt'];
  const timestampGranularities = ['word', 'segment'];

  return {
    models,
    responseFormats,
    timestampGranularities,
    languages
  };
};