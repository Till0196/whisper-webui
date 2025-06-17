// ユーティリティ型定義

// セレクター関数の型
export type Selector<T, R> = (state: T) => R;

// ストアのアクション型
export interface StoreAction<T = any> {
  type: string;
  payload?: T;
}

// 非同期状態の型
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// ページネーション関連
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// フォーム状態の型
export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
}

// 共通のイベントハンドラ型
export type EventHandler<T = Event> = (event: T) => void;
export type ChangeHandler<T = string> = (value: T) => void;

// API レスポンスの共通型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 時間関連のユーティリティ型
export interface TimeRange {
  start: number;
  end: number;
}

export interface Duration {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}
