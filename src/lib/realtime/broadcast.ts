import { getRealtimeProvider } from "./config";
import { buildChannelName } from "./utils/channel-naming";

export async function broadcast<T = unknown>(
  companyId: string,
  feature: string,
  event: string,
  data: T,
): Promise<void> {
  const provider = await getRealtimeProvider();
  const channel = buildChannelName(companyId, feature);
  const wrappedEvent = {
    event: `${feature}:${event}`,
    data,
    companyId,
    timestamp: new Date().toISOString(),
  };
  await provider.broadcast(channel, `${feature}:${event}`, wrappedEvent);
}

export function createBroadcaster(companyId: string, feature: string) {
  return async <T = unknown>(event: string, data: T) => {
    await broadcast(companyId, feature, event, data);
  };
}
