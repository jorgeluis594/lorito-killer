import { z } from "zod";
import type { RealtimeAdapter } from "./adapter.interface";

const realtimeConfigSchema = z.object({
  provider: z.enum(["supabase", "mock"]),
  supabaseUrl: z.string().optional(),
  supabaseAnonKey: z.string().optional(),
});

let providerInstance: RealtimeAdapter | null = null;

function getConfig() {
  return realtimeConfigSchema.parse({
    provider: process.env.NEXT_PUBLIC_REALTIME_PROVIDER ?? "mock",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export async function getRealtimeProvider(): Promise<RealtimeAdapter> {
  if (providerInstance) return providerInstance;

  const config = getConfig();

  if (config.provider === "supabase") {
    const { SupabaseRealtimeProvider } = await import(
      "./providers/supabase-provider"
    );
    providerInstance = new SupabaseRealtimeProvider({
      url: config.supabaseUrl!,
      anonKey: config.supabaseAnonKey!,
    });
  } else {
    const { MockRealtimeProvider } = await import("./providers/mock-provider");
    providerInstance = new MockRealtimeProvider();
  }

  return providerInstance;
}

export function resetRealtimeProvider(): void {
  providerInstance = null;
}
