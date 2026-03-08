import type { ConnectionState, Subscription } from "./types";

export interface RealtimeAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(subscription: Subscription): () => void;
  broadcast(channel: string, event: string, data: unknown): Promise<void>;
  getState(): ConnectionState;
  onStateChange(handler: (state: ConnectionState) => void): () => void;
}
