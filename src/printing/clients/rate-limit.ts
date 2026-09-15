import { connection } from "@/lib/queue/connection";

const key = (ip: string) => `print-client-link:${ip}`;

export const isLinkRateLimited = async (ip: string) =>
  Number((await connection.get(key(ip))) ?? 0) >= 5;

export const recordInvalidLink = async (ip: string) => {
  const redisKey = key(ip);
  const attempts = await connection.incr(redisKey);
  if (attempts === 1) await connection.expire(redisKey, 10 * 60);
};
