import { createClient } from "@supabase/supabase-js";
import type { RealtimeAdapter } from "../adapter.interface";
import type { ConnectionState, Subscription, BaseRealtimeEvent } from "../types";

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export class SupabaseRealtimeProvider implements RealtimeAdapter {
  private client: any;
  private state: ConnectionState = "disconnected";
  private stateHandlers = new Set<(state: ConnectionState) => void>();
  private channels = new Map<
    string,
    { channel: any; subscriptions: Set<Subscription> }
  >();

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.anonKey);
  }

  async connect(): Promise<void> {
    this.setState("connecting");
    try {
      this.setState("connected");
      console.log("[Realtime] Initial connection established (Supabase)");
    } catch (error) {
      this.setState("error");
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.removeAllChannels();
    this.channels.clear();
    this.setState("disconnected");
  }

  subscribe(subscription: Subscription): () => void {
    let entry = this.channels.get(subscription.channel);
    if (!entry) {
      const channel = this.client.channel(subscription.channel);
      const subscriptions = new Set<Subscription>();
      channel.on(
        "broadcast",
        { event: "*" },
        (payload: { event: string; payload: BaseRealtimeEvent }) => {
          subscriptions.forEach((current) => {
            if (current.event === payload.event) current.handler(payload.payload);
          });
        },
      );
      this.setState("connecting");
      channel.subscribe((status: string) => {
        if (status === "SUBSCRIBED" && this.state !== "connected") {
          this.setState("connected");
        }
        else if (status === "CLOSED") this.setState("disconnected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.setState("error");
        }
      });
      this.setState("connected");
      entry = { channel, subscriptions };
      this.channels.set(subscription.channel, entry);
    }

    entry.subscriptions.add(subscription);
    let active = true;

    return () => {
      if (!active) return;
      active = false;
      entry?.subscriptions.delete(subscription);
      if (entry && entry.subscriptions.size === 0) {
        this.client.removeChannel(entry.channel);
        this.channels.delete(subscription.channel);
      }
    };
  }

  async broadcast(channel: string, event: string, data: unknown): Promise<void> {
    await this.client.channel(channel).send({
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

export function createSupabaseRealtimeProvider(
  config: SupabaseConfig,
): SupabaseRealtimeProvider {
  return new SupabaseRealtimeProvider(config);
}
