import { getRealtimeProvider } from "./config";
import { createRealtimeManager } from "./utils/manager";
import { buildChannelName } from "./utils/channel-naming";

type Manager<T> = ReturnType<typeof createRealtimeManager<T>>;

const registry = new Map<string, Manager<any>>();

export async function getOrCreateManager<T>(
  companyId: string,
  feature: string,
  event: string,
): Promise<Manager<T>> {
  const key = `${companyId}:${feature}:${event}`;

  if (registry.has(key)) {
    return registry.get(key) as Manager<T>;
  }

  const provider = await getRealtimeProvider();
  const channel = buildChannelName(companyId, feature);
  const manager = createRealtimeManager<T>(provider, channel, `${feature}:${event}`);

  registry.set(key, manager);
  return manager;
}

export function clearRegistry(): void {
  registry.clear();
}
