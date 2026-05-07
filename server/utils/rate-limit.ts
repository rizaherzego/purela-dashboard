// Simple in-memory sliding-window rate limiter, keyed by IP.
//
// Caveat: on serverless platforms (Netlify functions) the in-memory state is
// per-cold-start, so this is best-effort. For a stronger guarantee, swap
// the Map for a Supabase-backed table. v1 acceptance: protects against
// dumb brute-force, doesn't claim to be airtight.

interface Bucket {
  attempts: number[]    // timestamps (ms) of recent failures
  blockedUntil?: number // ms epoch
}

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 10 * 60 * 1000       // 10-minute window
const MAX_ATTEMPTS = 5
const BLOCK_MS = 30 * 60 * 1000        // 30-minute block

export function isBlocked(ip: string): boolean {
  const b = buckets.get(ip)
  if (!b) return false
  return Boolean(b.blockedUntil && b.blockedUntil > Date.now())
}

export function recordFailure(ip: string): { blocked: boolean, retryAfterMs?: number } {
  const now = Date.now()
  const b = buckets.get(ip) ?? { attempts: [] }

  // Drop attempts outside the window
  b.attempts = b.attempts.filter(ts => now - ts < WINDOW_MS)
  b.attempts.push(now)

  if (b.attempts.length >= MAX_ATTEMPTS) {
    b.blockedUntil = now + BLOCK_MS
    buckets.set(ip, b)
    return { blocked: true, retryAfterMs: BLOCK_MS }
  }

  buckets.set(ip, b)
  return { blocked: false }
}

export function recordSuccess(ip: string): void {
  buckets.delete(ip)
}

export function getRetryAfterSeconds(ip: string): number {
  const b = buckets.get(ip)
  if (!b?.blockedUntil) return 0
  return Math.max(0, Math.ceil((b.blockedUntil - Date.now()) / 1000))
}
