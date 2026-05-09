import Papa from 'papaparse'

export interface ParsedFile {
  headers: string[]
  rows: Record<string, any>[]
  rowCount: number
}

// Parse a CSV file (Buffer/string) into records.
//
// TikTok exports — and many marketplace exports in general — have
// content-vs-metadata inconsistencies analogous to the xlsx clipped-!ref
// bug. We don't trust the file's framing; we scan the bytes:
//
//   1. Detect encoding from BOM (UTF-8, UTF-16 LE, UTF-16 BE). TikTok
//      occasionally ships UTF-16 LE; `.toString('utf8')` mangles those
//      bytes into U+FFFD characters that wreck every header.
//   2. Strip the BOM after decoding so the first header isn't prefixed
//      with U+FEFF (which would silently break exact-match lookups).
//   3. Let Papa auto-detect the delimiter (comma, tab, semicolon).
//   4. Drop phantom columns from TikTok's "trailing tabs" quirk: those
//      get auto-renamed by Papa to `_1`, `_2`, etc. and contain only
//      empty values across every row.
export function parseCsv(input: Buffer | string): ParsedFile {
  const text = Buffer.isBuffer(input)
    ? decodeWithEncoding(input)
    : stripBom(input)
  return parseOnce(text)
}

// ──────────────────────────────────────────────────────────────────────────

function decodeWithEncoding(buf: Buffer): string {
  // BOM sniffing
  if (buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    return buf.slice(3).toString('utf8')
  }
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) {
    // UTF-16 LE
    return decodeUtf16(buf.slice(2), true)
  }
  if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) {
    // UTF-16 BE
    return decodeUtf16(buf.slice(2), false)
  }
  // No BOM. Heuristic: if every other byte in the first ~200 chars is 0x00,
  // it's almost certainly UTF-16 LE without a BOM.
  if (looksLikeUtf16LE(buf)) return decodeUtf16(buf, true)
  return stripBom(buf.toString('utf8'))
}

function decodeUtf16(buf: Buffer, littleEndian: boolean): string {
  const out: number[] = []
  for (let i = 0; i + 1 < buf.length; i += 2) {
    out.push(littleEndian ? buf[i] | (buf[i + 1] << 8) : (buf[i] << 8) | buf[i + 1])
  }
  return String.fromCharCode(...out)
}

function looksLikeUtf16LE(buf: Buffer): boolean {
  const sample = Math.min(buf.length, 200)
  if (sample < 4) return false
  let zeros = 0
  for (let i = 1; i < sample; i += 2) if (buf[i] === 0) zeros++
  return zeros / (sample / 2) > 0.9
}

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s
}

function parseOnce(text: string): ParsedFile {
  // Pre-flight: TikTok occasionally prepends an English explanation note as
  // a single quoted line above the real header (seen in the affiliate-partner
  // export: `"Note: When you collaborate directly with partners..."`). Probe
  // the first ~10 rows without `header: true` to find the row with the most
  // columns, then drop anything noticeably skinnier above it.
  const skip = detectLeadingMetadataRows(text)
  const body = skip > 0 ? dropLeadingLines(text, skip) : text

  const result = Papa.parse<Record<string, any>>(body, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter: '', // empty string → Papa auto-detects (comma / tab / semicolon / pipe)
    transformHeader: (h) => h, // keep header verbatim — TikTok uses trailing spaces deliberately
  })

  if (result.errors.length > 0) {
    console.warn('[parse-csv] errors:', result.errors.slice(0, 3))
  }

  const rawHeaders = result.meta.fields ?? []
  const rawRows = result.data ?? []

  // Identify phantom columns: empty/whitespace-only name, OR a Papa-auto-renamed
  // duplicate (`_1`, `_2`, ...) where every value across every row is null/empty.
  // Both indicate trailing-delimiter noise (the orders export's "trailing tabs"
  // quirk and similar). Real columns rarely match `_\d+` AND are rarely 100%
  // empty across the whole file.
  const isAutoRename = (h: string) => /^_\d+$/.test(h)
  const isColumnAllEmpty = (h: string) => {
    for (const r of rawRows) {
      const v = (r as any)[h]
      if (v != null && String(v).trim() !== '') return false
    }
    return true
  }

  const keepHeaders: string[] = []
  const seen = new Set<string>()
  for (const h of rawHeaders) {
    if (!h || !h.trim()) continue
    if (isAutoRename(h) && isColumnAllEmpty(h)) continue
    if (seen.has(h)) continue
    seen.add(h)
    keepHeaders.push(h)
  }

  const rows = rawRows.map(r => {
    const out: Record<string, any> = {}
    for (const h of keepHeaders) out[h] = (r as any)[h]
    return out
  })

  return { headers: keepHeaders, rows, rowCount: rows.length }
}

// Probe the first chunk of the file (without `header: true`) and figure out
// how many leading rows are metadata vs. the actual header row. A row is
// considered metadata if its column count is < 1/3 of the maximum column
// count seen in the first 10 rows AND the gap to the densest row is sharp.
function detectLeadingMetadataRows(text: string): number {
  const probeText = text.slice(0, Math.min(text.length, 8000))
  const probe = Papa.parse<string[]>(probeText, {
    header: false,
    skipEmptyLines: 'greedy',
    delimiter: '',
  })
  const rows = (probe.data ?? []).slice(0, 10)
  if (rows.length < 2) return 0

  const maxCols = Math.max(...rows.map(r => r.length))
  if (maxCols < 4) return 0 // not a wide-enough file to bother

  // Find the first row whose column count is "close to" the max.
  // Anything before that is metadata.
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length >= Math.max(4, maxCols / 3)) {
      return i
    }
  }
  return 0
}

function dropLeadingLines(text: string, n: number): string {
  let cursor = 0
  for (let i = 0; i < n; i++) {
    const nl = text.indexOf('\n', cursor)
    if (nl === -1) return ''
    cursor = nl + 1
  }
  return text.slice(cursor)
}
