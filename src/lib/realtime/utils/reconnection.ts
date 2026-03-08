import type { RealtimeAdapter } from "../adapter.interface";

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30000;
const MAX_ATTEMPTS = 10;

export function createReconnectionManager(provider: RealtimeAdapter) {
  let attempt = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function scheduleReconnect() {
    if (timeoutId !== null || attempt >= MAX_ATTEMPTS) return;

    const delay = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
    attempt++;

    console.log(
      `[Realtime] Reconnecting in ${delay}ms (attempt ${attempt}/${MAX_ATTEMPTS})`,
    );

    timeoutId = setTimeout(async () => {
      timeoutId = null;
      try {
        await provider.connect();
      } catch {
        scheduleReconnect();
      }
    }, delay);
  }

  function reset() {
    attempt = 0;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  function cancel() {
    attempt = MAX_ATTEMPTS;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  return { scheduleReconnect, reset, cancel };
}
