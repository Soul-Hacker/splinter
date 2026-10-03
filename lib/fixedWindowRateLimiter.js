'use strict';

class FixedWindowRateLimiter {
  constructor({ windowMs = 60_000, maxKeys = 20_000 } = {}) {
    this.windowMs = windowMs;
    this.maxKeys = maxKeys;
    this.buckets = new Map();
    this.nextPruneAt = 0;
  }

  consume(key, limit, now = Date.now()) {
    let bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStart >= this.windowMs) {
      if (!bucket && this.buckets.size >= this.maxKeys) {
        if (now >= this.nextPruneAt) {
          this.prune(now);
          if (this.buckets.size >= this.maxKeys) {
            this.nextPruneAt = Math.min(this.nextPruneAt, now + this.windowMs);
          }
        }
        if (this.buckets.size >= this.maxKeys) {
          return { allowed: false, retryAfter: Math.ceil(this.windowMs / 1000) };
        }
      }
      bucket = { count: 1, windowStart: now };
      this.buckets.set(key, bucket);
    } else {
      bucket.count++;
    }

    const retryAfter = Math.max(
      1,
      Math.ceil((bucket.windowStart + this.windowMs - now) / 1000)
    );
    return { allowed: bucket.count <= limit, retryAfter };
  }

  prune(now = Date.now()) {
    this.nextPruneAt = Infinity;
    for (const [key, bucket] of this.buckets) {
      const expiresAt = bucket.windowStart + this.windowMs;
      if (expiresAt <= now) this.buckets.delete(key);
      else this.nextPruneAt = Math.min(this.nextPruneAt, expiresAt);
    }
    if (this.buckets.size < this.maxKeys) this.nextPruneAt = 0;
  }
}

module.exports = { FixedWindowRateLimiter };