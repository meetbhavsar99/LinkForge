import Redis from "ioredis";

// Single shared client. ioredis handles reconnection internally.
// Do NOT create a new client per request, as there could be a connection leak waiting to happen.
export const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  // Retry strategy: exponential backoff, give up after 10 attempts during boot.
  // In prod I'd want this to keep trying forever, but during dev it's nice to fail loudly if Redis isn't running.
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null; // stop retrying
    return Math.min(times * 100, 3000);
  },
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

redis.on("connect", () => {
  console.log("Redis connected");
});
