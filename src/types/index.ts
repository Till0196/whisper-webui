export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
  words: {
    word: string;
    start: number;
    end: number;
    probability: number;
  }[] | null;
}

export type LogEntry = {
  type: 'info' | 'error' | 'debug';
  message: string;
};

export interface ApiStatus {
  isHealthy: boolean;
  message: string;
  details: string;
}

export interface Model {
  id: string;
  task: string;
  language: string[] | null;
}

export interface ApiOptions {
  models: {
    id: string;
  }[];
  responseFormats: string[];
  timestampGranularities: string[];
  languages: string[];
}

export type Language = 'ja' | 'en';

export type LanguageNames = {
  [key in Language]: {
    [key: string]: string;
  };
}; 