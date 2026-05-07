import * as XLSX from 'xlsx'
import type { ParsedFile } from './parse-csv'

// Parse an XLSX/XLS file into records.
// `preferredSheet` is optional — TikTok income statements have a sheet
// named "Order details"; if absent, we use the first sheet.
export function parseXlsx(input: Buffer, preferredSheet?: string): ParsedFile {
  const wb = XLSX.read(input, { type: 'buffer', cellDates: true, cellNF: false })

  let sheetName = preferredSheet && wb.SheetNames.includes(preferredSheet)
    ? preferredSheet
    : wb.SheetNames[0]

  if (!sheetName) {
    return { headers: [], rows: [], rowCount: 0 }
  }

  const sheet = wb.Sheets[sheetName]
  // raw: false → date cells become ISO strings rather than Excel serial numbers
  // defval: null → empty cells materialize as null instead of being absent
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    raw: false,
    defval: null,
  })

  // Headers preserved verbatim (incl. trailing spaces)
  const headers = rows.length > 0
    ? Object.keys(rows[0])
    : (XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] as string[] ?? [])

  return { headers, rows, rowCount: rows.length }
}
