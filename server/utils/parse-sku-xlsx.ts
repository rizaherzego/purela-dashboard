// SKU master parser for the user's Excel export. Two sheets:
//
//   RSP        — 15 individual products. Header in row 1, blank row 2,
//                product rows 3..17, "AVERAGE" footer in row 18.
//                Columns: NO, Produk, Netto, HPP, RSP, BOTTOM PRICE,
//                BIAYA LAIN, MARGIN, PRESENTASE.
//
//   Bundling   — Hierarchical layout. Header row 1, blank row 2.
//                A bundle "header" row has values in `no`/`Nama Bundling`
//                /`Bottom Price`/`Mark Up` plus the FIRST component on the
//                same row. Each subsequent row with `no`=null is another
//                component of the previous bundle.
//                Columns: no, Nama Bundling, Isi Bundling, Netto,
//                Bottom Price, Mark Up.
//                Note: `no` has gaps (12, 15, 20 missing) and `19` repeats
//                on two distinct bundles (Newborn Kit, Mini Newborn Kit).
//                We assign our own sequential index after dedup.
//
// Component name strings include "(free)" / "(FREE)" markers and a lot of
// noise (gifts, packaging, free-text notes). We pass them through verbatim
// and let sku-suggest.ts decide what's matchable.

import * as XLSX from 'xlsx'

export interface ParsedRspRow {
  excel_row: number       // 1-based original Excel row, for error messages
  produk: string          // raw product name with "Purela" prefix
  netto: string           // raw netto string e.g. "70gr "
  hpp: number | null
  rsp: number | null
  bottom_price: number | null
  biaya_lain: number | null
}

export interface ParsedBundleComponent {
  excel_row: number
  raw_name: string        // verbatim from "Isi Bundling"
  raw_netto: string | number | null
}

export interface ParsedBundle {
  excel_row: number
  excel_no: number | null // value of the `no` column in the source (null if missing)
  bundle_name: string
  bottom_price: number | null
  mark_up: number | null  // RSP-equivalent for the bundle
  components: ParsedBundleComponent[]
}

export interface ParsedSkuFile {
  products: ParsedRspRow[]
  bundles: ParsedBundle[]
  warnings: string[]
}

export function parseSkuFile(input: Buffer): ParsedSkuFile {
  const wb = XLSX.read(input, { type: 'buffer', cellDates: false })
  const warnings: string[] = []

  const rspSheet = wb.Sheets['RSP']
  const bundleSheet = wb.Sheets['Bundling']

  if (!rspSheet) {
    throw new Error('Excel file is missing the "RSP" sheet.')
  }
  if (!bundleSheet) {
    throw new Error('Excel file is missing the "Bundling" sheet.')
  }

  const products = parseRspSheet(rspSheet, warnings)
  const bundles = parseBundleSheet(bundleSheet, warnings)

  return { products, bundles, warnings }
}

// ---- RSP --------------------------------------------------------------------

function parseRspSheet(sheet: XLSX.WorkSheet, warnings: string[]): ParsedRspRow[] {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true })
  const out: ParsedRspRow[] = []

  // Skip header (row 1) and blank (row 2). Iterate from index 2.
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i] ?? []
    const [no, produk, netto, hpp, rsp, bottom, biaya] = row

    // Footer: "AVERAGE" row has no=null and produk="AVERAGE". Skip.
    const produkStr = produk == null ? '' : String(produk).trim()
    if (!produkStr) continue
    if (produkStr.toLowerCase() === 'average' || no == null) {
      continue
    }

    out.push({
      excel_row: i + 1,
      produk: produkStr,
      netto: netto == null ? '' : String(netto).trim(),
      hpp: toNum(hpp),
      rsp: toNum(rsp),
      bottom_price: toNum(bottom),
      biaya_lain: toNum(biaya),
    })
  }

  if (out.length === 0) warnings.push('RSP sheet had zero data rows.')
  return out
}

// ---- Bundling ---------------------------------------------------------------

function parseBundleSheet(sheet: XLSX.WorkSheet, warnings: string[]): ParsedBundle[] {
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true })
  const bundles: ParsedBundle[] = []
  let current: ParsedBundle | null = null

  for (let i = 1; i < rows.length; i++) {                    // skip header row 1
    const row = rows[i] ?? []
    const [no, nama, isi, netto, bottom, markup] = row

    // Fully blank row → either between sections or trailing. Doesn't start
    // a new bundle; doesn't append to current. Skip.
    if (no == null && nama == null && isi == null) continue

    const isBundleHeader = no != null || (nama != null && String(nama).trim() !== '')

    if (isBundleHeader) {
      const bundleName = (nama == null ? '' : String(nama).trim())
      if (!bundleName) {
        warnings.push(`Row ${i + 1}: bundle header row missing name; skipping`)
        current = null
        continue
      }
      current = {
        excel_row: i + 1,
        excel_no: typeof no === 'number' ? no : (no == null ? null : Number(no)),
        bundle_name: bundleName,
        bottom_price: toNum(bottom),
        mark_up: toNum(markup),
        components: [],
      }
      bundles.push(current)
      // The header row also carries the FIRST component on the same line.
      if (isi != null && String(isi).trim()) {
        current.components.push({
          excel_row: i + 1,
          raw_name: String(isi).trim(),
          raw_netto: netto,
        })
      }
      continue
    }

    // Continuation row (no/name null) — append component to current bundle.
    if (current && isi != null && String(isi).trim()) {
      current.components.push({
        excel_row: i + 1,
        raw_name: String(isi).trim(),
        raw_netto: netto,
      })
    }
  }

  if (bundles.length === 0) warnings.push('Bundling sheet had zero bundle rows.')
  return bundles
}

// ---- Helpers ----------------------------------------------------------------

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const cleaned = String(v).replace(/[, ]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}
