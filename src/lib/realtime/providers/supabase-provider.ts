import type { RealtimeAdapter } from "../adapter.interface";
import type { ConnectionState, Subscription, BaseRealtimeEvent } from "../types";

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export class SupabaseRealtimeProvider implements RealtimeAdapter {
  private client: any = null;
  private state: ConnectionState = "disconnected";
  private stateHandlers = new Set<(state: ConnectionState) => void>();
  private channels = new Map<string, any>();

  constructor(private config: SupabaseConfig) {}

  private async getClient() {
    if (!this.client) {
      const { createClient } = await import("@supabase/supabase-js");
      this.client = createClient(this.config.url, this.config.anonKey);
    }
    return this.client;
  }

  async connect(): Promise<void> {
    this.setState("connecting");
    try {
      await this.getClient();
      this.setState("connected");
      console.log("[Realtime] Initial connection established (Supabase)");
    } catch (error) {
      this.setState("error");
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    const client = await this.getClient();
    await client.removeAllChannels();
    this.channels.clear();
    this.setState("disconnected");
  }

  subscribe(subscription: Subscription): () => void {
    if (!this.client) {
      console.warn("[Realtime] Cannot subscribe: not connected");
      return () => {};
    }

    let channel = this.channels.get(subscription.channel);
    if (!channel) {
      channel = this.client.channel(subscription.channel);
      this.channels.set(subscription.channel, channel);
    }

    channel.on(
      "broadcast",
      { event: subscription.event },
      (payload: { payload: BaseRealtimeEvent }) => {
        subscription.handler(payload.payload);
      },
    );

    channel.subscribe();

    return () => {
      channel.unsubscribe();
      this.channels.delete(subscription.channel);
    };
  }

  async broadcast(channel: string, event: string, data: unknown): Promise<void> {
    const client = await this.getClient();
    await client.channel(channel).send({
      type: "broadcast",
      event,
      payload: data,
    });
  }

  getState(): ConnectionState {
    return this.state;
  }

  onStateChange(handler: (state: ConnectionState) => void): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.stateHandlers.forEach((h) => h(state));
  }
}
