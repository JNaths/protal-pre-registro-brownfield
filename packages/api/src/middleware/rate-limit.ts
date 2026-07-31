import type { RequestHandler } from "express";

// WR-06: dependency-free, in-memory, per-IP fixed-window rate limiter for the
// public unauthenticated write endpoint (POST /api/pre-registros). Without
// throttling, the endpoint is trivially abusable for spam/record flooding and
// resource exhaustion (each request runs a DB transaction + sanitize-html).
//
// WHY NOT `express-rate-limit`: that package is not installed in this
// workspace, and importing an uninstalled dependency would break the build.
// This is a self-contained, zero-dependency stand-in.
//
// SCOPE / CAVEAT: the counter lives in a SINGLE process's memory, so it does
// NOT coordinate across multiple API instances behind a load balancer. For a
// horizontally-scaled production deployment, replace this with
// `express-rate-limit` backed by a shared store (e.g. Redis / Memcached), and
// enable `app.set("trust proxy", ...)` so `req.ip` reflects the real client
// address behind the proxy. The default limit below is conservative and should
// be confirmed with product.

interface RateLimitOptions {
  /** Rolling window length in milliseconds. */
  windowMs: number;
  /** Maximum requests permitted per IP within a window. */
  max: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

// Prune expired buckets only when the map grows past this many distinct IPs,
// so a public endpoint cannot leak memory unbounded. We deliberately avoid a
// background timer (setInterval) — it would keep the process alive and leak a
// handle in the vitest/supertest test harness.
const PRUNE_THRESHOLD = 10_000;

export function createRateLimit(options: RateLimitOptions): RequestHandler {
  const { windowMs, max } = options;
  const buckets = new Map<string, Bucket>();

  return (req, res, next) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (bucket === undefined || now >= bucket.resetAt) {
      if (buckets.size > PRUNE_THRESHOLD) {
        for (const [existingKey, existingBucket] of buckets) {
          if (now >= existingBucket.resetAt) buckets.delete(existingKey);
        }
      }
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({
        error: {
          message: "Demasiadas solicitudes. Intenta de nuevo más tarde.",
        },
      });
      return;
    }

    bucket.count += 1;
    next();
  };
}
