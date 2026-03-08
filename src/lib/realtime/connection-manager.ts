import { getRealtimeProvider } from "./config";
import { createReconnectionManager } from "./utils/reconnection";

export async function initializeRealtimeConnection(): Promise<() => void> {
  const provider = await getRealtimeProvider();

  await provider.connect();

  const reconnectionManager = createReconnectionManager(provider);

  const unsubscribeState = provider.onStateChange((state) => {
    if (state === "disconnected" || state === "error") {
      reconnectionManager.scheduleReconnect();
    } else if (state === "connected") {
      reconnectionManager.reset();
    }
  });

  return () => {
    unsubscribeState();
    reconnectionManager.cancel();
    provider.disconnect();
  };
}
