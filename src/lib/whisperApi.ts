import { ApiStatus, ApiOptions, TranscriptionOptions, Model } from '../types';

export const API_ENDPOINTS = {
  HEALTH: '/health',
  OPTIONS: '/v1/models',
  TRANSCRIBE: '/v1/audio/transcriptions',
  TRANSLATE: '/v1/audio/translations',
  SPEECH: '/v1/audio/speech',
  SPEECH_TIMESTAMPS: '/v1/audio/speech/timestamps',
  REALTIME: '/v1/realtime'
} as const;

export const checkApiHealth = async (url: string, token?: string): Promise<ApiStatus> => {
  try {
    const healthUrl = `${url}${API_ENDPOINTS.HEALTH}`;
    const response = await fetch(healthUrl, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      
      // エラーレスポンスがJSONかどうか確認
      let formattedErrorBody = errorBody;
      try {
        if (errorBody.trim().startsWith('{') || errorBody.trim().startsWith('[')) {
          const jsonBody = JSON.parse(errorBody);
          formattedErrorBody = JSON.stringify(jsonBody, null, 2);
        }
      } catch (e) {
        // JSONではない場合は元のテキストを使用
        console.debug('Error response is not valid JSON', e);
      }
      
      return {
        status: 'error',
        message: `HTTP error! status: ${response.status}`,
        details: `${response.statusText}\n\n${formattedErrorBody}`
      };
    }

    const body = await response.text().catch(() => '');
    
    // レスポンスがJSONかどうか確認し、適切に処理
    let details = body;
    try {
      if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
        const jsonBody = JSON.parse(body);
        details = JSON.stringify(jsonBody, null, 2);
      }
    } catch (e) {
      // JSONではない場合は元のテキストを使用
      console.debug('Health check response is not valid JSON', e);
    }
    
    return {
      status: 'healthy',
      message: 'API is healthy',
      details
    };

  } catch (error) {
    return {
      status: 'error',
      message: 'Connection to API server failed',
      details: error instanceof Error 
        ? `${error.message}\n\n${error.stack || ''}` 
        : String(error)
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
  const models: Model[] = data.data.map((model: any) => ({
    id: model.id,
    task: model.task,
    language: model.language || null
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

export const transcribeAudioChunk = async (
  baseUrl: string,
  chunk: Uint8Array,
  chunkIndex: number,
  options: TranscriptionOptions,
  token?: string,
  onStreamUpdate?: (segments: any[]) => void
): Promise<any> => {
  try {
    // ArrayBufferが切り離される問題を回避するため、データのコピーを作成
    const chunkCopy = new Uint8Array(chunk.length);
    chunkCopy.set(chunk);

    const formData = new FormData();
    
    // コピーしたデータからBlobを作成
    const blob = new Blob([chunkCopy], { type: 'audio/wav' });
    
    formData.append('file', blob, `audio_chunk_${chunkIndex}.wav`);
    formData.append('model', options.model);
    
    if (options.language && options.language !== 'auto') {
      formData.append('language', options.language);
    }
    
    formData.append('response_format', options.responseFormat || 'vtt');
    
    // ストリーミングを有効にする
    formData.append('stream', 'true');
    
    if (options.timestampGranularity) {
      formData.append('timestamp_granularities', options.timestampGranularity);
    }
    
    if (options.temperature !== undefined) {
      formData.append('temperature', options.temperature.toString());
    }
    
    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }
    
    if (options.hotwords && options.hotwords.length > 0) {
      formData.append('hotwords', options.hotwords.join(','));
    }
    
    if (options.useVadFilter) {
      formData.append('vad_filter', 'true');
    }

    const endpoint = options.task === 'translate' ? API_ENDPOINTS.TRANSLATE : API_ENDPOINTS.TRANSCRIBE;
    const fullUrl = baseUrl.startsWith('/whisper') ? `${baseUrl}${endpoint}` : `${baseUrl}${endpoint}`;
    
    // Content-Typeヘッダーを明示的に設定しない（ブラウザに自動設定させる）
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: formData
    });



    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    // ストリーミングレスポンスの処理
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('レスポンスが読み取れません');
    }

    let result = '';
    let allSegments: any[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const text = new TextDecoder().decode(value);
      result += text;

      // VTT形式のセグメントをリアルタイムで解析
      // data:プレフィックスまたは-->を含む場合に解析を実行
      if ((text.includes('-->') || text.includes('data:')) && onStreamUpdate) {
        const segments = parseVTTText(result);
        if (segments.length > allSegments.length) {
          allSegments = segments;
          onStreamUpdate(segments);
        }
      }
    }

    // Content-Typeを確認してレスポンス形式を判定
    const contentType = response.headers.get('content-type') || '';
    
    if (options.responseFormat === 'vtt' || options.responseFormat === 'srt' || contentType.includes('text/plain')) {
      // VTT、SRT、またはテキスト形式の場合
      return result;
    } else {
      // JSON形式の場合
      const jsonResult = JSON.parse(result);
      return jsonResult;
    }
    
  } catch (error) {
    console.error('transcribeAudioChunk error:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`ネットワークエラー: APIサーバーに接続できません。URLを確認してください: ${baseUrl}`);
    }
    if (error instanceof Error && error.message.includes('detached ArrayBuffer')) {
      throw new Error(`メモリエラー: 音声データの処理中に問題が発生しました。ファイルサイズを小さくしてお試しください。`);
    }
    throw error;
  }
};

// VTTテキストをパースしてセグメントに変換するヘルパー関数
const parseVTTText = (vttText: string): any[] => {
  const segments: any[] = [];
  const lines = vttText.split('\n');
  let currentSegment: any = {};
  let segmentId = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // SSE形式のdata:プレフィックスを除去
    if (line.startsWith('data: ')) {
      line = line.substring(6); // "data: "を除去
    }
    
    // タイムスタンプ行を検出
    if (line.includes('-->')) {
      const [startTime, endTime] = line.split('-->').map(t => t.trim());
      const parsedStart = parseVTTTime(startTime);
      const parsedEnd = parseVTTTime(endTime);
      
      // 有効な時間値のみを受け入れる
      if (!isNaN(parsedStart) && !isNaN(parsedEnd) && parsedStart >= 0 && parsedEnd >= 0 && parsedEnd > parsedStart) {
        currentSegment.id = segmentId++;
        currentSegment.seek = 0;
        currentSegment.start = parsedStart;
        currentSegment.end = parsedEnd;
        currentSegment.tokens = [];
        currentSegment.temperature = 0;
        currentSegment.avg_logprob = 0;
        currentSegment.compression_ratio = 0;
        currentSegment.no_speech_prob = 0;
        currentSegment.words = null;
      } else {
        // 無効な時間値の場合は現在のセグメントをリセット
        currentSegment = {};
      }
    } else if (line && !line.startsWith('WEBVTT') && !line.startsWith('NOTE') && currentSegment.start !== undefined) {
      // テキスト行（有効なセグメントの場合のみ）
      // 前の行で設定されたタイムスタンプがある場合のみテキストを追加
      if (currentSegment.text) {
        // 既にテキストがある場合は改行で連結
        currentSegment.text += '\n' + line;
      } else {
        currentSegment.text = line;
      }
      
      // 次の行をチェックして、新しいタイムスタンプまたは空行の場合はセグメントを完了
      let shouldCompleteSegment = false;
      if (i + 1 >= lines.length) {
        // ファイル終端
        shouldCompleteSegment = true;
      } else {
        const nextLine = lines[i + 1].trim();
        const nextLineClean = nextLine.startsWith('data: ') ? nextLine.substring(6) : nextLine;
        if (!nextLine || nextLineClean.includes('-->')) {
          shouldCompleteSegment = true;
        }
      }
      
      if (shouldCompleteSegment) {
        segments.push({ ...currentSegment }); // オブジェクトのコピーを作成
        currentSegment = {};
      }
    }
  }

  // 重複セグメントを削除（緩い重複チェック）
  const uniqueSegments = segments.filter((segment, index, self) => 
    index === self.findIndex(s => 
      Math.abs(s.start - segment.start) < 0.1 && 
      Math.abs(s.end - segment.end) < 0.1 &&
      s.text?.trim() === segment.text?.trim()
    )
  );

  return uniqueSegments;
};

// VTTの時間形式をパースする関数（エラーハンドリング強化）
const parseVTTTime = (timeStr: string): number => {
  if (!timeStr || typeof timeStr !== 'string') {
    return NaN;
  }

  const cleanTimeStr = timeStr.trim();
  const parts = cleanTimeStr.split(':');
  
  try {
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseFloat(parts[2]);
      
      if (isNaN(hours) || isNaN(minutes) || isNaN(seconds) || 
          hours < 0 || minutes < 0 || seconds < 0 || 
          minutes >= 60 || seconds >= 60) {
        return NaN;
      }
      
      return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseFloat(parts[1]);
      
      if (isNaN(minutes) || isNaN(seconds) || 
          minutes < 0 || seconds < 0 || seconds >= 60) {
        return NaN;
      }
      
      return minutes * 60 + seconds;
    } else if (parts.length === 1) {
      const seconds = parseFloat(parts[0]);
      
      if (isNaN(seconds) || seconds < 0) {
        return NaN;
      }
      
      return seconds;
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Error parsing VTT time:', timeStr, error);
    }
    return NaN;
  }
  
  return NaN;
};

export const getApiEndpoint = (baseUrl: string, endpoint: string, useServerProxy: boolean): string => {
  if (useServerProxy) {
    // プロキシを使用する場合は、baseUrl（/whisper）にendpointを結合
    return baseUrl.endsWith('/') ? `${baseUrl.slice(0, -1)}${endpoint}` : `${baseUrl}${endpoint}`;
  }
  // プロキシを使用しない場合は、baseUrlとendpointを結合
  return baseUrl.endsWith('/') ? `${baseUrl.slice(0, -1)}${endpoint}` : `${baseUrl}${endpoint}`;
};

export const transcribeAudio = async (
  url: string,
  file: File,
  options: TranscriptionOptions,
  token?: string,
  onProgress?: (progress: number) => void
): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', options.model);
  formData.append('response_format', options.responseFormat || 'verbose_json');
  formData.append('task', options.task || 'transcribe');

  if (options.language && options.language !== 'auto') {
    formData.append('language', options.language);
  }

  if (options.timestampGranularity) {
    formData.append('timestamp_granularities', options.timestampGranularity);
  }
  
  if (options.useVadFilter) {
    formData.append('vad_filter', 'true');
  }

  const endpoint = options.task === 'translate' ? API_ENDPOINTS.TRANSLATE : API_ENDPOINTS.TRANSCRIBE;
  const response = await fetch(`${url}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` })
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail?.[0]?.msg || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};