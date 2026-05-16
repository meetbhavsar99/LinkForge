import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { redis } from "../db/redis";

const router = Router();

// Cache TTL: how long a short code -> long URL mapping stays in Redis.
// 1 hour is a reasonable starting point. The longer it is, the better the
// cache hit rate will be, but the longer stale data lingers if a destination is ever changed
// (which the current schema doesn't allow, so this is moot for now).
const CACHE_TTL_SECONDS = 60 * 60;

// Negative cache TTL: how long we remember that a code does NOT exist.
// This prevents scanners from hammering Postgres with /:randomstring lookups.
// Shorter than positive TTL — we don't want to lock out a code that gets
// created shortly after someone probed for it.
const NEGATIVE_CACHE_TTL_SECONDS = 60;

// Sentinel value for negative cache entries.
// We need to distinguish "URL not in cache" (null from Redis)
// from "we checked Postgres and it doesn't exist" (cached miss).
const NEGATIVE_CACHE_MARKER = "__NOT_FOUND__";

function cacheKey(code: string): string {
  return `url:${code}`;
}

// GET /:code - public redirect endpoint
// This is the hot path: 100:1 read-heavy. Every optimization matters here.
router.get("/:code", async (req: Request, res: Response) => {
  const code = Array.isArray(req.params.code)
    ? req.params.code[0]
    : req.params.code;

  // Basic validation: Base62 codes are alphanumeric only.
  // Reject obviously malformed requests before hitting the DB.
  // This also stops favicon.ico and other noise from causing DB queries.
  if (!code || !/^[0-9A-Za-z]+$/.test(code) || code.length > 12) {
    return res.status(404).send("Not found");
  }

  // Step 1: try Redis, but don't let Redis failures break redirects.
  // If Redis is down, we degrade to "Postgres on every request" — slower
  // but still correct. This is "fail open" caching.
  let cached: string | null = null;
  try {
    cached = await redis.get(cacheKey(code));
  } catch (err) {
    console.error("Redis read failed, falling through to Postgres:", err);
  }

  if (cached === NEGATIVE_CACHE_MARKER) {
    return res.status(404).send("Not found");
  }
  if (cached) {
    return res.redirect(301, cached);
  }

  // Step 2: Postgres lookup
  try {
    const url = await prisma.url.findUnique({
      where: { shortCode: code },
      select: { longUrl: true }, // only fetch what we need
    });

    if (!url) {
      // Populate negative cache. If Redis is down, just skip.
      redis
        .set(
          cacheKey(code),
          NEGATIVE_CACHE_MARKER,
          "EX",
          NEGATIVE_CACHE_TTL_SECONDS,
        )
        .catch((err) =>
          console.error("Redis negative cache write failed:", err),
        );
      return res.status(404).send("Not found");
    }

    // Populate positive cache. Fire and forget — we have the answer already,
    // and a failed cache write shouldn't delay the redirect.
    redis
      .set(cacheKey(code), url.longUrl, "EX", CACHE_TTL_SECONDS)
      .catch((err) => console.error("Redis cache write failed:", err));

    // 301 = permanent redirect. Browsers and proxies cache 301s aggressively,
    // which is what we want for short URLs. Use 302 if ever need to
    // change destinations dynamically.
    return res.redirect(301, url.longUrl);
  } catch (err) {
    console.error("Postgres redirect lookup failed:", err);
    return res.status(500).send("Internal error");
  }
});

export default router;
