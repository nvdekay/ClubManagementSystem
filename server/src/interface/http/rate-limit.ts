import type { NextFunction, Request, Response } from 'express'
import { fail } from './response.js'

export interface RateLimitRule {
  /** Maximum requests one client may make inside a window. */
  limit: number
  windowMs: number
}

export interface RateLimitOptions extends RateLimitRule {
  /** Clock injection for tests; defaults to Date.now. */
  now?: () => number
  /** How often expired buckets are swept; defaults to the window length. */
  cleanupIntervalMs?: number
}

interface Bucket {
  count: number
  resetAt: number
}

/**
 * In-memory fixed-window limiter keyed by client IP (req.ip honours the app's `trust proxy`
 * setting). Single-process only: each instance keeps its own counters, which is enough to blunt
 * brute force and floods against one Node process without adding a dependency or a shared store.
 */
export function rateLimit(options: RateLimitOptions) {
  const now = options.now ?? Date.now
  const buckets = new Map<string, Bucket>()
  const sweep = setInterval(() => {
    const at = now()
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= at) {
        buckets.delete(key)
      }
    }
  }, options.cleanupIntervalMs ?? options.windowMs)
  sweep.unref() // never keeps the process (or a test runner) alive

  function limiter(req: Request, res: Response, next: NextFunction) {
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    const at = now()
    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= at) {
      bucket = { count: 0, resetAt: at + options.windowMs }
      buckets.set(key, bucket)
    }
    bucket.count += 1
    if (bucket.count > options.limit) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - at) / 1000))))
      fail(res, req, 429, 'too_many_requests', 'too many requests, try again later')
      return
    }
    next()
  }
  limiter.bucketCount = function bucketCount() {
    return buckets.size
  }
  limiter.stop = function stop() {
    clearInterval(sweep)
  }
  return limiter
}
