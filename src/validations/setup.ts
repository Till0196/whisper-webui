import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { vi, beforeEach, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';

// Ensure JSDOM environment is properly initialized
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable'
});

// Make sure global objects are available
global.window = dom.window as any;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.Text = dom.window.Text;
global.Comment = dom.window.Comment;

// CSSStyleSheet mock for Material-UI
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

// LocalStorageのモック - より強力なバージョン
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

// 最初にlocalStorageを複数の場所に定義して確実にアクセス可能にする
(globalThis as any).localStorage = localStorageMock;
(global as any).localStorage = localStorageMock;

// windowのlocalStorageはgetter/setterプロパティなので、Object.definePropertyを使用
Object.defineProperty(global.window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
});

// React Testing Libraryの設定
configure({
  testIdAttribute: 'data-testid',
});

// Ensure DOM globals are available before setup
beforeAll(() => {
  // Force jsdom environment setup
  if (typeof window === 'undefined') {
    // This should not happen with jsdom environment, but just in case
    throw new Error('Tests require jsdom environment. Please check vitest.config.ts');
  }

  // Define localStorage on multiple places to ensure it's available
  if (!global.localStorage) {
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    });
  }

  if (!window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    });
  }

  // Also define it directly on globalThis for Node.js compatibility
  if (typeof globalThis !== 'undefined' && !globalThis.localStorage) {
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true
    });
  }
});

// Global mocks for Web APIs - Using Object.defineProperty for better compatibility
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

// matchMedia mock - ensure it's on window object
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

// fetch mock
Object.defineProperty(global, 'fetch', {
  value: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
    text: async () => '',
    blob: async () => new Blob([]),
    arrayBuffer: async () => new ArrayBuffer(0),
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    url: 'http://localhost',
    type: 'basic',
    redirected: false,
    clone: vi.fn()
  }),
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
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
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

// Ensure window.sessionStorage matches global.sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: { ...localStorageMock },
  writable: true
});

// Zustand用のLocalStorage初期化
beforeEach(() => {
  vi.clearAllMocks();
  // Reset localStorage calls
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
  localStorageMock.clear.mockReset();
  
  // デフォルト値を返すよう設定（Zustandのため）
  localStorageMock.getItem.mockReturnValue(null);
});

// モックの設定
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// FileReaderのモック
const MockFileReader = class {
  static readonly EMPTY = 0;
  static readonly LOADING = 1;
  static readonly DONE = 2;
  
  readonly EMPTY = 0;
  readonly LOADING = 1;
  readonly DONE = 2;
  
  readAsArrayBuffer = vi.fn();
  readAsDataURL = vi.fn();
  readAsText = vi.fn();
  result: string | ArrayBuffer | null = '';
  error: DOMException | null = null;
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  readyState: 0 | 1 | 2 = 0;
  abort = vi.fn();
  
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
};

// @ts-ignore - テスト用のモック
global.FileReader = MockFileReader as any;

// URLのモック
global.URL.createObjectURL = vi.fn(() => 'mocked-url');
global.URL.revokeObjectURL = vi.fn();

// i18nextのモック
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'ja',
      isInitialized: true,
      changeLanguage: vi.fn(),
    },
  }),
}));

// Zustandストアのモック
vi.mock('../store/useAppStore', () => ({
  useTemperatureSettings: () => ({ useTemperature: false, temperature: 0.7 }),
  useTemperatureSettingsUpdater: () => ({
    setUseTemperature: vi.fn(),
    setTemperature: vi.fn(),
  }),
  useVadFilter: () => true,
  useVadFilterUpdater: () => ({ setVadFilter: vi.fn() }),
  usePrompt: () => '',
  usePromptUpdater: () => ({ setPrompt: vi.fn() }),
  useHotwords: () => [],
  useHotwordsUpdater: () => ({ setHotwords: vi.fn() }),
}));

vi.mock('../store/useApiOptionsStore', () => ({
  useApiOptions: () => ({
    models: ['whisper-1'],
    languages: [{ code: 'ja', name: '日本語' }],
    timestampGranularities: ['segment'],
  }),
  useSelectedModel: () => 'whisper-1',
  useSelectedModelUpdater: () => ({ setSelectedModel: vi.fn() }),
  useSelectedLanguage: () => 'ja',
  useSelectedLanguageUpdater: () => ({ setSelectedLanguage: vi.fn() }),
  useSelectedTimestampGranularity: () => 'segment',
  useSelectedTimestampGranularityUpdater: () => ({ setSelectedTimestampGranularity: vi.fn() }),
}));
