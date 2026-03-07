import type { RealtimeAdapter } from "../adapter.interface";

export function createRealtimeManager<T>(
  provider: RealtimeAdapter,
  channel: string,
  event: string,
) {
  const listeners = new Set<(data: T) => void>();
  let unsubscribe: (() => void) | null = null;

  function ensureSubscribed() {
    if (unsubscribe) return;
    unsubscribe = provider.subscribe({
      channel,
      event,
      handler: (payload) => {
        listeners.forEach((listener) => listener(payload.data as T));
      },
    });
  }

  function addListener(handler: (data: T) => void): () => void {
    ensureSubscribed();
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
      if (listeners.size === 0 && unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };
  }

  function notify(data: T) {
    listeners.forEach((listener) => listener(data));
  }

  return { addListener, notify };
}
