import type { RealtimeAdapter } from "../adapter.interface";
import type { ConnectionState, Subscription, BaseRealtimeEvent } from "../types";

export class MockRealtimeProvider implements RealtimeAdapter {
  private state: ConnectionState = "disconnected";
  private stateHandlers = new Set<(state: ConnectionState) => void>();
  private subscriptions = new Map<string, Set<Subscription>>();

  async connect(): Promise<void> {
    this.setState("connecting");
    await new Promise((resolve) => setTimeout(resolve, 10));
    this.setState("connected");
    console.log("[Realtime] Initial connection established (Mock)");
  }

  async disconnect(): Promise<void> {
    this.subscriptions.clear();
    this.setState("disconnected");
  }

  subscribe(subscription: Subscription): () => void {
    const key = `${subscription.channel}:${subscription.event}`;
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    this.subscriptions.get(key)!.add(subscription);

    return () => {
      this.subscriptions.get(key)?.delete(subscription);
    };
  }

  async broadcast(channel: string, event: string, data: unknown): Promise<void> {
    const key = `${channel}:${event}`;
    const subs = this.subscriptions.get(key);
    if (subs) {
      subs.forEach((sub) => sub.handler(data as BaseRealtimeEvent));
    }
  }

  getState(): ConnectionState {
    return this.state;
  }

  onStateChange(handler: (state: ConnectionState) => void): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  simulateEvent(channel: string, event: string, data: BaseRealtimeEvent): void {
    const key = `${channel}:${event}`;
    const subs = this.subscriptions.get(key);
    if (subs) {
      subs.forEach((sub) => sub.handler(data));
    }
  }

  simulateDisconnect(): void {
    this.setState("disconnected");
  }

  simulateReconnect(): void {
    this.setState("connected");
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.stateHandlers.forEach((h) => h(state));
  }
}
