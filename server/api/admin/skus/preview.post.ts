// Preview the SKU master upload. Parses the user's Excel, runs the
// suggestion pipeline, and returns a fully-editable preview payload.
// No DB writes — that's commit.post.ts.

import { parseSkuFile } from '~~/server/utils/parse-sku-xlsx'
import {
  suggestProductSku,
  suggestBundleSku,
  fuzzyMatchComponent,
  buildCandidates,
  detectFree,
} from '~~/server/utils/sku-suggest'

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB — SKU master files are tiny

export interface PreviewProduct {
  excel_row: number
  suggested_sku: string
  product_name: string             // cleaned (Purela prefix stripped)
  raw_name: string                 // original from Excel
  category: string | null
  netto: string                    // canonical "70gr" / "100ml"
  hpp: number | null
  biaya_lain: number | null
  rsp: number | null
  bottom_price: number | null
}

export interface PreviewComponent {
  excel_row: number
  raw_name: string
  raw_netto: string | number | null
  suggested_component_sku: string | null
  is_free: boolean
  confidence: 'high' | 'medium' | 'low'
  reason: string
  // Default UI behaviour: skip if no match. Free items also skip by default
  // so bundle COGS doesn't double-count gifts.
  skip_by_default: boolean
}

export interface PreviewBundle {
  excel_row: number
  excel_no: number | null
  suggested_bundle_sku: string
  bundle_name: string
  bottom_price: number | null
  mark_up: number | null
  components: PreviewComponent[]
}

export interface PreviewResponse {
  file_name: string
  products: PreviewProduct[]
  bundles: PreviewBundle[]
  warnings: string[]
  stats: {
    products_count: number
    bundles_count: number
    components_total: number
    components_high_confidence: number
    components_skip_by_default: number
  }
}

export default defineEventHandler(async (event): Promise<PreviewResponse> => {
  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400, statusMessage: 'No multipart form data.' })

  const filePart = form.find(p => p.name === 'file' && p.filename)
  if (!filePart) throw createError({ statusCode: 400, statusMessage: 'file is required.' })
  if (filePart.data.length > MAX_FILE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'File too large (max 10MB).' })
  }
  if (!/\.xlsx?$/i.test(filePart.filename ?? '')) {
    throw createError({ statusCode: 400, statusMessage: 'Only .xlsx files are accepted here.' })
  }

  let parsed
  try {
    parsed = parseSkuFile(Buffer.from(filePart.data))
  }
  catch (e: any) {
    throw createError({ statusCode: 400, statusMessage: e?.message ?? 'Failed to parse Excel.' })
  }

  // ---- Build product previews ----
  const products: PreviewProduct[] = parsed.products.map((row) => {
    const sug = suggestProductSku(row.produk, row.netto)
    return {
      excel_row: row.excel_row,
      suggested_sku: sug.suggested_sku,
      product_name: cleanProductName(row.produk),
      raw_name: row.produk,
      category: sug.category,
      netto: sug.size_text,
      hpp: row.hpp,
      biaya_lain: row.biaya_lain,
      rsp: row.rsp,
      bottom_price: row.bottom_price,
    }
  })

  // Build candidates for component matching (using suggested SKUs we just made)
  const candidates = buildCandidates(
    products.map(p => ({
      suggested_sku: p.suggested_sku,
      name: p.product_name,
      netto: p.netto,
    })),
  )

  // ---- Build bundle previews ----
  const bundles: PreviewBundle[] = parsed.bundles.map((b, idx) => {
    const components: PreviewComponent[] = b.components.map((c) => {
      const isFree = detectFree(c.raw_name)
      const match = fuzzyMatchComponent(c.raw_name, c.raw_netto, candidates)
      const skipByDefault = isFree || match.matched_sku == null
      return {
        excel_row: c.excel_row,
        raw_name: c.raw_name,
        raw_netto: typeof c.raw_netto === 'number' ? c.raw_netto : (c.raw_netto == null ? null : String(c.raw_netto)),
        suggested_component_sku: match.matched_sku,
        is_free: isFree,
        confidence: match.confidence,
        reason: isFree ? `${match.reason} (also marked as free)` : match.reason,
        skip_by_default: skipByDefault,
      }
    })
    return {
      excel_row: b.excel_row,
      excel_no: b.excel_no,
      suggested_bundle_sku: suggestBundleSku(idx + 1),
      bundle_name: b.bundle_name,
      bottom_price: b.bottom_price,
      mark_up: b.mark_up,
      components,
    }
  })

  // ---- Stats ----
  const allComponents = bundles.flatMap(b => b.components)
  const highConf = allComponents.filter(c => c.confidence === 'high').length
  const willSkip = allComponents.filter(c => c.skip_by_default).length

  return {
    file_name: filePart.filename ?? 'sku-master.xlsx',
    products,
    bundles,
    warnings: parsed.warnings,
    stats: {
      products_count: products.length,
      bundles_count: bundles.length,
      components_total: allComponents.length,
      components_high_confidence: highConf,
      components_skip_by_default: willSkip,
    },
  }
})

// "Purela Soothing Baby Creme " → "Soothing Baby Creme"
function cleanProductName(raw: string): string {
  return raw.replace(/^purela\s+/i, '').trim().replace(/\s+/g, ' ')
}
