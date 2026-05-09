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

  // TikTok's xlsx export sets sheet['!ref'] to a smaller range than the
  // actual data (e.g. A1:X2 when columns A..AX exist). sheet_to_json honors
  // !ref and silently drops everything outside it. We recompute !ref from
  // the cell keys present so all data is included.
  fixSheetRange(sheet)

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

// Walk every populated cell and recompute the bounding range. SheetJS
// honors `!ref` blindly when iterating, so a too-tight ref clips real data.
function fixSheetRange(sheet: XLSX.WorkSheet) {
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity
  for (const key of Object.keys(sheet)) {
    if (key.startsWith('!')) continue
    const addr = XLSX.utils.decode_cell(key)
    if (addr.r < minR) minR = addr.r
    if (addr.r > maxR) maxR = addr.r
    if (addr.c < minC) minC = addr.c
    if (addr.c > maxC) maxC = addr.c
  }
  if (minR === Infinity) return // empty sheet — leave as-is
  sheet['!ref'] = XLSX.utils.encode_range({
    s: { r: minR, c: minC },
    e: { r: maxR, c: maxC },
  })
}
