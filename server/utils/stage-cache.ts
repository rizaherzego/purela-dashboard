// In-memory stash of staged-but-not-imported parsed files.
// Keyed by SHA-256 of file bytes (so re-staging overwrites cleanly).
//
// Caveat: serverless cold-starts will lose this. v1 acceptance: a user
// stages and confirms within the same warm window; if the cache misses,
// we tell them to re-upload. Long-term, persist staged batches to a
// `staged_imports` table.

interface StagedEntry {
  rows: Record<string, any>[]
  rawBytes: Buffer
  fileName: string
  fileTypeId: string
  channelId: string
  createdAt: number
}

const cache = new Map<string, StagedEntry>()
const TTL_MS = 30 * 60 * 1000 // 30 minutes

function evictExpired() {
  const now = Date.now()
  for (const [k, v] of cache.entries()) {
    if (now - v.createdAt > TTL_MS) cache.delete(k)
  }
}

export function stashStaged(hash: string, entry: Omit<StagedEntry, 'createdAt'>) {
  evictExpired()
  cache.set(hash, { ...entry, createdAt: Date.now() })
}

export function popStaged(hash: string): StagedEntry | null {
  evictExpired()
  const entry = cache.get(hash)
  if (!entry) return null
  cache.delete(hash)
  return entry
}

export function peekStaged(hash: string): StagedEntry | null {
  evictExpired()
  return cache.get(hash) ?? null
}
