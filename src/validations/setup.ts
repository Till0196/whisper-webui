import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { vi, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// MSWサーバーのセットアップ
export const server = setupServer(
  // デフォルトのAPIハンドラー
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'healthy', timestamp: Date.now() });
  }),
  
  http.get('/api/models', () => {
    return HttpResponse.json({
      models: ['whisper-1', 'whisper-large-v3', 'whisper-large-v2']
    });
  }),
  
  http.get('/api/languages', () => {
    return HttpResponse.json({
      languages: [
        { code: 'ja', name: '日本語' },
        { code: 'en', name: 'English' },
        { code: 'zh', name: '中文' }
      ]
    });
  }),
  
  http.post('/api/transcribe', async ({ request }) => {
    const formData = await request.formData();
    const model = formData.get('model') as string || 'whisper-1';
    const language = formData.get('language') as string || 'auto';
    
    return HttpResponse.json({
      segments: [
        { start: 0, end: 5, text: 'Mock transcription result' }
      ],
      language: language === 'auto' ? 'ja' : language,
      model_used: model
    });
  }),
  
  http.get('/config.js', () => {
    return HttpResponse.text(`
      window.APP_CONFIG = {
        WHISPER_API_URL: "http://localhost:9000",
        WHISPER_API_TOKEN: "",
        USE_SERVER_PROXY: "false",
        SERVER_PROXY_URL: "http://localhost:8080",
        APP_TITLE: "Whisper WebUI Test",
        ENVIRONMENT: "test"
      };
    `);
  })
);

// テスト開始前にMSWサーバーを起動
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// 各テスト後にハンドラーをリセット
afterEach(() => {
  server.resetHandlers();
});

// すべてのテスト終了後にサーバーを停止
afterAll(() => {
  server.close();
});

// JSDOM環境の設定
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable'
});

// グローバルオブジェクトの設定
global.window = dom.window as any;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.Text = dom.window.Text;
global.Comment = dom.window.Comment;

// React 18のcreateRoot対応のためのDOM要素設定
Object.defineProperty(global.window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
});

// documentに必要なメソッドを追加
Object.defineProperty(global.document, 'createElement', {
  value: dom.window.document.createElement.bind(dom.window.document),
  writable: true,
});

// 必要に応じてbodyにrootを追加
beforeEach(() => {
  // JSDOMの環境をリフレッシュ
  if (global.document) {
    global.document.body.innerHTML = '';
    // 新しいrootを作成
    const root = global.document.createElement('div');
    root.id = 'root';
    global.document.body.appendChild(root);
  }
});

// CSSStyleSheet mock
Object.defineProperty(global, 'CSSStyleSheet', {
  value: class {
    cssRules: any[] = [];
    insertRule = vi.fn();
    deleteRule = vi.fn();
    ownerRule = null;
    rules: any[] = [];
    addRule = vi.fn();
    removeRule = vi.fn();
  },
  writable: true
});

// LocalStorage mock（実際のデータを保存）
const createLocalStorageMock = () => {
  const store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    length: 0,
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
};

const localStorageMock = createLocalStorageMock();

// localStorage を複数の場所に定義
(globalThis as any).localStorage = localStorageMock;
(global as any).localStorage = localStorageMock;
Object.defineProperty(global.window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
});

// React Testing Libraryの設定
configure({
  testIdAttribute: 'data-testid',
});

// Web APIs のモック
Object.defineProperty(global, 'sessionStorage', {
  value: { ...localStorageMock },
  writable: true
});

// FileReader mock
Object.defineProperty(global, 'FileReader', {
  value: class {
    onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
    onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
    readyState: number = 0;
    result: string | ArrayBuffer | null = null;

    readAsArrayBuffer(file: Blob): void {
      const self = this;
      setTimeout(() => {
        self.result = new ArrayBuffer(8);
        self.readyState = 2; // DONE
        if (self.onload) {
          (self.onload as any).call(self, { target: self } as unknown as ProgressEvent<FileReader>);
        }
      }, 10);
    }

    readAsText(file: Blob): void {
      const self = this;
      setTimeout(() => {
        self.result = 'mocked file content';
        self.readyState = 2; // DONE
        if (self.onload) {
          (self.onload as any).call(self, { target: self } as unknown as ProgressEvent<FileReader>);
        }
      }, 10);
    }

    readAsDataURL(file: Blob): void {
      const self = this;
      setTimeout(() => {
        self.result = 'data:text/plain;base64,bW9ja2VkIGZpbGUgY29udGVudA==';
        self.readyState = 2; // DONE
        if (self.onload) {
          (self.onload as any).call(self, { target: self } as unknown as ProgressEvent<FileReader>);
        }
      }, 10);
    }

    abort(): void {}
    addEventListener(): void {}
    removeEventListener(): void {}
    dispatchEvent(): boolean { return true; }
  },
  writable: true
});

// matchMedia mock
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  })),
  writable: true
});

// Worker mock
Object.defineProperty(global, 'Worker', {
  value: class {
    constructor() {}
    postMessage(): void {}
    terminate(): void {}
    addEventListener(): void {}
    removeEventListener(): void {}
    onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
    onerror: ((this: Worker, ev: ErrorEvent) => any) | null = null;
    dispatchEvent(): boolean { return true; }
  },
  writable: true
});

// Clipboard API mock
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue([])
  },
  writable: true
});

// URL mock
Object.defineProperty(global, 'URL', {
  value: class URL {
    constructor(url: string, base?: string) {
      this.href = url;
      this.origin = base || 'http://localhost:3000';
    }
    
    href: string;
    origin: string;
    
    static createObjectURL = vi.fn(() => 'blob:mock-url');
    static revokeObjectURL = vi.fn();
  },
  writable: true
});

// ResizeObserver mock
Object.defineProperty(global, 'ResizeObserver', {
  value: class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  },
  writable: true
});

// IntersectionObserver mock
Object.defineProperty(global, 'IntersectionObserver', {
  value: class {
    constructor() {}
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    root: Element | null = null;
    rootMargin: string = '';
    thresholds: ReadonlyArray<number> = [];
    takeRecords(): IntersectionObserverEntry[] { return []; }
  },
  writable: true
});

// i18next のモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      // パラメータ補間をサポート
      if (options && typeof options === 'object') {
        let result = key;
        // {{param}} 形式のプレースホルダーをオプションの値で置換
        Object.keys(options).forEach(param => {
          const placeholder = new RegExp(`{{${param}}}`, 'g');
          result = result.replace(placeholder, String(options[param]));
        });
        return result;
      }
      return key;
    },
    i18n: {
      language: 'ja',
      isInitialized: true,
      changeLanguage: vi.fn().mockResolvedValue(undefined),
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

// 各テスト前の初期化
beforeEach(() => {
  vi.clearAllMocks();
  // Reset localStorage
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
  localStorageMock.clear.mockReset();
  
  // デフォルト値を設定
  localStorageMock.getItem.mockReturnValue(null);
});

// fetch mock
Object.defineProperty(global, 'fetch', {
  value: vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: vi.fn().mockResolvedValue({
      segments: [
        { start: 0, end: 5, text: 'Mock transcription result' }
      ],
      language: 'ja',
      model_used: 'whisper-1'
    }),
    text: vi.fn().mockResolvedValue('Mock response'),
    blob: vi.fn().mockResolvedValue(new Blob()),
  }),
  writable: true
});

// Navigation mock for JSDOM
Object.defineProperty(global.window, 'navigation', {
  value: {
    navigate: vi.fn(),
  },
  writable: true
});

// HTMLAnchorElement click mock
const originalClick = global.HTMLAnchorElement.prototype.click;
global.HTMLAnchorElement.prototype.click = function() {
  // Do nothing in test environment to prevent navigation errors
  return;
};

// Unhandled rejection handling
process.on('unhandledRejection', (reason, promise) => {
  console.warn('Unhandled Rejection at:', promise, 'reason:', reason);
  // テスト環境では警告のみとし、プロセス終了を防ぐ
});

process.on('uncaughtException', (error) => {
  console.warn('Uncaught Exception:', error);
  // テスト環境では警告のみとし、プロセス終了を防ぐ
});