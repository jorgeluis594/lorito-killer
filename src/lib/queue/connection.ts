import IORedis from "ioredis";

let connection: IORedis;

if (process.env.NODE_ENV === "production") {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL environment variable is required in production");
  }
  connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
} else {
  if (!(global as any).__redis) {
    (global as any).__redis = new IORedis(
      process.env.REDIS_URL || "redis://localhost:6379",
      {
        maxRetriesPerRequest: null,
      },
    );
  }
  connection = (global as any).__redis;
}

export { connection };
