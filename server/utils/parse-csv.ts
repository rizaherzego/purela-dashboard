import Papa from 'papaparse'

export interface ParsedFile {
  headers: string[]
  rows: Record<string, any>[]
  rowCount: number
}

// Parse a CSV file (Buffer/string) into records.
// papaparse handles quoting, BOM, mixed line endings, and trailing tabs gracefully.
export function parseCsv(input: Buffer | string): ParsedFile {
  const text = Buffer.isBuffer(input) ? input.toString('utf8') : input

  const result = Papa.parse<Record<string, any>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h, // keep header verbatim — TikTok uses trailing spaces deliberately
  })

  if (result.errors.length > 0) {
    // Soft-warn on parser errors but return whatever rows we got
    console.warn('[parse-csv] errors:', result.errors.slice(0, 3))
  }

  const headers = result.meta.fields ?? []
  const rows = result.data ?? []
  return { headers, rows, rowCount: rows.length }
}
