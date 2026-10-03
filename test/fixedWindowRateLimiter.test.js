'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { FixedWindowRateLimiter } = require('../lib/fixedWindowRateLimiter');

test('allows the limit, rejects later requests, and resets at the window boundary', () => {
  const limiter = new FixedWindowRateLimiter({ windowMs: 60_000 });

  assert.deepEqual(limiter.consume('client', 2, 1_000), { allowed: true, retryAfter: 60 });
  assert.deepEqual(limiter.consume('client', 2, 2_000), { allowed: true, retryAfter: 59 });
  assert.deepEqual(limiter.consume('client', 2, 3_000), { allowed: false, retryAfter: 58 });
  assert.deepEqual(limiter.consume('client', 2, 60_999), { allowed: false, retryAfter: 1 });
  assert.deepEqual(limiter.consume('client', 2, 61_000), { allowed: true, retryAfter: 60 });
});

test('keeps separate client counters and bounds stored keys', () => {
  const limiter = new FixedWindowRateLimiter({ windowMs: 1_000, maxKeys: 1 });

  assert.equal(limiter.consume('first', 1, 0).allowed, true);
  assert.equal(limiter.consume('second', 1, 1).allowed, false);
  assert.equal(limiter.consume('second', 1, 1_000).allowed, true);
  assert.equal(limiter.buckets.size, 1);
});