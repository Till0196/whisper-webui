import { useRef, useCallback, useSyncExternalStore } from 'react';

type StateChangeListener<T> = (newState: T, oldState: T) => void;
type StateSelector<T, R> = (state: T) => R;

/**
 * 状態管理ストア
 * 状態の作成、変更、購読を分離して管理する
 */
export class StateStore<T> {
  private state: T;
  private listeners = new Set<StateChangeListener<T>>();

  constructor(initialState: T) {
    this.state = initialState;
  }

  /**
   * 現在の状態を取得
   */
  getState(): T {
    return this.state;
  }

  /**
   * 状態を更新し、リスナーに通知
   */
  setState(newState: T | ((prevState: T) => T)): void {
    const oldState = this.state;
    this.state = typeof newState === 'function' 
      ? (newState as (prevState: T) => T)(this.state)
      : newState;
    
    // 浅い比較で変更があった場合のみ通知
    if (!this.shallowEqual(this.state, oldState)) {
      this.listeners.forEach(listener => listener(this.state, oldState));
    }
  }

  /**
   * 浅い比較（オブジェクトの第一レベルのプロパティのみ比較）
   */
  private shallowEqual(objA: T, objB: T): boolean {
    if (objA === objB) {
      return true;
    }

    if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
      return false;
    }

    const keysA = Object.keys(objA as Record<string, unknown>);
    const keysB = Object.keys(objB as Record<string, unknown>);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (const key of keysA) {
      if (!(objB as Record<string, unknown>).hasOwnProperty(key) || 
          (objA as Record<string, unknown>)[key] !== (objB as Record<string, unknown>)[key]) {
        return false;
      }
    }

    return true;
  }

  /**
   * 状態変更リスナーを購読
   */
  subscribe(listener: StateChangeListener<T>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 選択された値の変更のみを購読
   */
  subscribeToSelector<R>(
    selector: StateSelector<T, R>,
    onStoreChange: () => void
  ): () => void {
    let currentValue = selector(this.state);
    
    const unsubscribe = this.subscribe((newState) => {
      const newValue = selector(newState);
      
      // 深い比較で値が実際に変更された場合のみ通知
      if (!this.deepEqual(newValue, currentValue)) {
        currentValue = newValue;
        onStoreChange();
      }
    });

    return unsubscribe;
  }

  /**
   * 深い比較（ネストしたオブジェクトも比較）
   */
  public deepEqual(a: any, b: any): boolean {
    if (a === b) return true;

    if (typeof a !== typeof b) return false;

    if (typeof a !== 'object' || a === null || b === null) {
      return a === b;
    }

    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.deepEqual(a[key], b[key])) return false;
    }

    return true;
  }
}

/**
 * 1. 状態を作成し、初期値を設定するだけのhook
 * このhookを持っているコンポーネントは状態変更通知を受け取らない
 */
export function useStateCreator<T>(initialState: T): StateStore<T> {
  const storeRef = useRef<StateStore<T>>();
  
  if (!storeRef.current) {
    storeRef.current = new StateStore(initialState);
  }
  
  return storeRef.current;
}

/**
 * 2. 状態の変更通知を受け取り、コンポーネントの再評価を行うhook
 * 指定されたセレクターの結果が変更された時のみ再レンダリング
 */
export function useStateSelector<T, R>(
  store: StateStore<T>,
  selector: StateSelector<T, R>
): R {
  const selectorRef = useRef(selector);
  const resultRef = useRef<R>();
  
  // セレクターが変更された場合は参照を更新
  selectorRef.current = selector;
  
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return store.subscribeToSelector(selectorRef.current, onStoreChange);
    },
    [store]
  );

  const getSnapshot = useCallback(() => {
    const result = selectorRef.current(store.getState());
    
    // 深い比較で結果が同じ場合は前回の参照を返す
    if (resultRef.current !== undefined && store.deepEqual(result, resultRef.current)) {
      return resultRef.current;
    }
    
    resultRef.current = result;
    return result;
  }, [store]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * 3. 状態を変更して通知を送り、自分自身は通知を受け取らない関数
 * 状態変更のみに特化した関数
 */
export function useStateDispatcher<T>(store: StateStore<T>) {
  return useCallback((newState: T | ((prevState: T) => T)) => {
    store.setState(newState);
  }, [store]);
}

/**
 * 便利なヘルパー: 状態の特定のプロパティのみを更新
 */
export function useStateUpdater<T extends Record<string, any>>(
  store: StateStore<T>
) {
  return useCallback((updates: Partial<T>) => {
    store.setState(prevState => ({
      ...prevState,
      ...updates
    }));
  }, [store]);
}

/**
 * 便利なヘルパー: 現在の状態値を一度だけ取得（再レンダリングなし）
 */
export function useStateSnapshot<T>(store: StateStore<T>): T {
  return store.getState();
}
