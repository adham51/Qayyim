// lib/parallel/redis.ts
import { Redis } from "ioredis";

const redisConfig = {
  // IMPORTANT: use env, not localhost
  url: process.env.REDIS_URL,

  maxRetriesPerRequest: null,
  enableReadyCheck: false,

  // KEY FIX: do NOT connect at import time
  lazyConnect: true,
};

// Create SEPARATE Redis connections for queue and worker
export const createRedisConnection = () => {
  if (!redisConfig.url) {
    throw new Error("REDIS_URL is not defined");
  }

  const redis = new Redis(redisConfig.url, redisConfig);

  // ⬇️ KEEP YOUR LOGGING (unchanged)
  redis.on("connect", () => {
    console.log("✅ Redis (Queue) connected successfully");
  });

  redis.on("error", (error) => {
    console.error("❌ Redis (Queue) connection error:", error);
  });

  redis.on("close", () => {
    console.log("⚠️ Redis (Queue) connection closed");
  });

  return redis;
};

// ⛔ REMOVE eager default connection (this was the build-time bug)
// export const redisConnection = createRedisConnection();
// export default redisConnection;
