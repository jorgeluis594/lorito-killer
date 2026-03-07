export type ConnectionState = "connected" | "disconnected" | "connecting" | "error";

export interface BaseRealtimeEvent<T = unknown> {
  event: string;
  data: T;
  companyId: string;
  timestamp: string;
}

export interface Subscription {
  channel: string;
  event: string;
  handler: (payload: BaseRealtimeEvent) => void;
}
