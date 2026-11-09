/**
 * 测试环境兜底：Node 26 自带一个未启用的实验性全局 localStorage，
 * 它会把 jsdom 的 window.localStorage 顶成 undefined，导致依赖 localStorage 的用例裸跑必挂。
 * 这里在任何用例执行前补一个纯内存实现（仅在缺失或不可用时）。
 */
const store = new Map<string, string>();

const memoryStorage: Storage = {
  get length() {
    return store.size;
  },
  clear() {
    store.clear();
  },
  getItem(key: string) {
    return store.has(key) ? (store.get(key) as string) : null;
  },
  key(index: number) {
    return Array.from(store.keys())[index] ?? null;
  },
  removeItem(key: string) {
    store.delete(key);
  },
  setItem(key: string, value: string) {
    store.set(key, String(value));
  },
};

function usable(ls: unknown): boolean {
  try {
    const candidate = ls as Storage | undefined;
    if (!candidate || typeof candidate.setItem !== 'function') return false;
    candidate.setItem('__probe__', '1');
    candidate.removeItem('__probe__');
    return true;
  } catch {
    return false;
  }
}

const g = globalThis as Record<string, unknown>;
if (!usable(g.localStorage)) {
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true, writable: true });
}
if (typeof window !== 'undefined' && !usable((window as unknown as Record<string, unknown>).localStorage)) {
  Object.defineProperty(window, 'localStorage', { value: memoryStorage, configurable: true, writable: true });
}
