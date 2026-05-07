import { timingSafeEqual } from 'node:crypto'

// Constant-time string compare to mitigate timing attacks on password check.
// Pads to a fixed length so crypto.timingSafeEqual doesn't refuse mismatched lengths.
export function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  // Pad to the longer of the two to keep timingSafeEqual happy
  const len = Math.max(aBuf.length, bBuf.length, 1)
  const padded = (buf: Buffer) => {
    const out = Buffer.alloc(len, 0)
    buf.copy(out)
    return out
  }
  const eq = timingSafeEqual(padded(aBuf), padded(bBuf))
  return eq && aBuf.length === bBuf.length
}
