import IORedis, { type RedisOptions } from "ioredis";

let connection: IORedis;

function createRedisOptions(redisUrl: string): RedisOptions {
  const options: RedisOptions = {
    maxRetriesPerRequest: null,
  };

  if (
    redisUrl.startsWith("rediss://") &&
    process.env.REDIS_TLS_REJECT_UNAUTHORIZED === "false"
  ) {
    options.tls = {
      rejectUnauthorized: false,
    };
  }

  return options;
}

if (process.env.NODE_ENV === "production") {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL environment variable is required in production");
  }
  connection = new IORedis(
    process.env.REDIS_URL,
    createRedisOptions(process.env.REDIS_URL),
  );
} else {
  if (!(global as any).__redis) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    (global as any).__redis = new IORedis(
      redisUrl,
      createRedisOptions(redisUrl),
    );
  }
  connection = (global as any).__redis;
}

export { connection };
