/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WHISPER_API_URL: string
  readonly VITE_WHISPER_API_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 