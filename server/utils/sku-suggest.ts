// Pure functions for suggesting SKU codes, categories, and fuzzy-matching
// component-name strings to internal SKUs. Called from the SKU master upload
// preview endpoint and the channel_sku_mapping suggester.
//
// All product naming follows the existing convention "PUR-{abbrev}-{size}"
// (e.g. PUR-FW-100 for Foaming Facial Wash 100ml). We derive the abbreviation
// from keyword tokens in the product name rather than initials, so renames
// don't break SKUs and so abbreviations are predictable.

export interface ProductLite {
  sku: string
  product_name: string
  unit_size: string | null
}

// ---- Size parsing -----------------------------------------------------------

const SIZE_RE = /(\d+(?:\.\d+)?)\s*(ml|gr|g|gram|kg)?/i

// Pull a numeric size from a string like "70gr ", "185gr", "100ml", or just "70".
// Returns null when the string is empty / "Tentatif" / contains no number.
export function parseSize(input: unknown): { value: number, unit: 'ml' | 'gr' | null } | null {
  if (input == null) return null
  const s = String(input).trim()
  if (!s || s.toLowerCase() === 'tentatif') return null
  const m = s.match(SIZE_RE)
  if (!m) return null
  const value = parseFloat(m[1])
  if (!Number.isFinite(value) || value <= 0) return null
  const unit = m[2]?.toLowerCase()
  if (unit === 'ml') return { value, unit: 'ml' }
  if (unit === 'gr' || unit === 'g' || unit === 'gram') return { value, unit: 'gr' }
  return { value, unit: null }
}

export function formatSize(size: { value: number, unit: 'ml' | 'gr' | null } | null): string {
  if (!size) return ''
  return size.unit ? `${size.value}${size.unit}` : `${size.value}`
}

// ---- Keyword-based product classification -----------------------------------
//
// Each pattern: a list of trigger keywords (any-of) and the product abbreviation
// to use. Order matters — earlier patterns win. "calming" must be checked
// before "cream" so that "Calming Baby Cream" → CC rather than getting confused
// with plain "creme".

interface ProductKind {
  abbrev: string         // SKU abbreviation segment ("SBC", "FW", "CO", ...)
  category: string       // products.category value
  keywords: string[]     // any-of match (lowercase)
  // Some products share an abbrev (Hair Lotion 60ml/100ml both → HL); the size
  // disambiguates. A few share a name keyword too (Calming Cream 60gr/20gr).
}

const PRODUCT_KINDS: ProductKind[] = [
  // Sunscreen first — "everyday sunscreen" contains no other trigger word.
  { abbrev: 'SS',  category: 'sunscreen',   keywords: ['sunscreen'] },
  // Facial wash before generic "wash"
  { abbrev: 'FW',  category: 'facial wash', keywords: ['facial wash', 'foaming facial wash'] },
  // Cleansing gel
  { abbrev: 'CG',  category: 'cleanser',    keywords: ['cleansing gel', 'cleansing'] },
  // Hair Lotion — must beat plain "lotion"
  { abbrev: 'HL',  category: 'hair lotion', keywords: ['hair lotion', 'hair-lotion', 'hairlotion'] },
  // Calming Baby Cream — must beat plain "cream"/"creme"
  { abbrev: 'CC',  category: 'cream',       keywords: ['calming cream', 'calming baby cream', 'calming'] },
  // Soothing Baby Creme
  { abbrev: 'SBC', category: 'cream',       keywords: ['soothing creme', 'soothing baby creme', 'soothing cream', 'soothing baby cream', 'soothing'] },
  // Nourishing Baby Lotion / Body Lotion / "Baby Lotion"
  { abbrev: 'NBL', category: 'lotion',      keywords: ['nourishing baby lotion', 'body lotion', 'baby lotion'] },
  // Goodnite Oil
  { abbrev: 'GO',  category: 'oil',         keywords: ['goodnite oil', 'good nite oil', 'goodnight oil', 'good night oil', 'goodnite', 'nite oil'] },
  // Cologne / parfum
  { abbrev: 'CO',  category: 'cologne',     keywords: ['cologne', 'parfum'] },
  // Toothpaste
  { abbrev: 'TP',  category: 'oral',        keywords: ['toothpaste', 'tooth paste'] },
  // Tooth spray
  { abbrev: 'TS',  category: 'oral',        keywords: ['tooth spray', 'toothspray'] },
]

// Lowercase normalize: strip diacritics, parens, trailing/leading whitespace.
// Keep "free" markers OUT of the matched string by replacing the parens chunks.
export function normalizeName(input: unknown): string {
  if (input == null) return ''
  return String(input)
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')              // strip "(free)", "(FREE)", etc.
    .replace(/[^a-z0-9 ]+/g, ' ')          // strip punctuation (but keep digits for "60ml")
    .replace(/\bpurela\b/g, ' ')           // strip brand prefix
    .replace(/\bbesar\b/g, ' ')            // ID "besar" = big — meaningless for matching
    .replace(/\s+/g, ' ')
    .trim()
}

// Returns the matching PRODUCT_KIND for a name string, or null if no keyword fires.
export function classifyName(rawName: string): ProductKind | null {
  const n = normalizeName(rawName)
  if (!n) return null
  for (const kind of PRODUCT_KINDS) {
    if (kind.keywords.some(k => n.includes(k))) return kind
  }
  return null
}

// ---- (free) marker detection ------------------------------------------------

const FREE_RE = /\(\s*free\s*\)/i

export function detectFree(rawName: unknown): boolean {
  if (rawName == null) return false
  return FREE_RE.test(String(rawName))
}

// ---- Suggest a SKU code for an RSP product row -----------------------------

export interface ProductSuggestion {
  suggested_sku: string
  category: string | null
  abbrev: string | null
  size_text: string                    // canonical "70gr" / "100ml"
  size_value: number | null
}

export function suggestProductSku(productName: string, netto: string | number | null): ProductSuggestion {
  const kind = classifyName(productName)
  const size = parseSize(netto)
  const sizeText = formatSize(size) || (typeof netto === 'string' ? netto.trim() : '')
  const sizeForSku = size?.value ?? ''
  const abbrev = kind?.abbrev ?? deriveFallbackAbbrev(productName)
  return {
    suggested_sku: `PUR-${abbrev}-${sizeForSku}`,
    category: kind?.category ?? null,
    abbrev,
    size_text: sizeText,
    size_value: size?.value ?? null,
  }
}

// Last-resort: take the first 2-3 alphabetic characters of the cleaned name.
// Only fires when classifyName returns null.
function deriveFallbackAbbrev(name: string): string {
  const tokens = normalizeName(name).split(' ').filter(t => /[a-z]/.test(t))
  if (!tokens.length) return 'X'
  if (tokens.length === 1) return tokens[0].slice(0, 3).toUpperCase()
  return tokens.slice(0, 2).map(t => t[0]).join('').toUpperCase()
}

// ---- Bundle SKU --------------------------------------------------------------

export function suggestBundleSku(seqIdx: number): string {
  return `PUR-BDL-${String(seqIdx).padStart(2, '0')}`
}

// ---- Component fuzzy-match --------------------------------------------------
//
// Match a bundle component string ("Soothing Creme" / "Hair lotion (free)" /
// "Baby Lotion besar") + numeric netto against the freshly-suggested products.
// Strategy:
//   1. classifyName() → abbrev (e.g. "HL"). If no match → low confidence, skip.
//   2. Among products with that abbrev, prefer the one whose size matches.
//      If only one product has that abbrev, use it regardless of size.
//      If multiple products with that abbrev and netto matches one → that one.
//      If multiple and netto doesn't match any → return the closest by size.

export interface ComponentMatchResult {
  matched_sku: string | null
  confidence: 'high' | 'medium' | 'low'
  reason: string                        // human-readable explanation for the UI
}

interface ProductCandidate extends ProductLite {
  abbrev: string
  size_value: number | null
}

export function buildCandidates(products: { suggested_sku: string, name: string, netto: string | null }[]): ProductCandidate[] {
  return products.map(p => {
    const parts = p.suggested_sku.split('-')               // ["PUR", "ABBR", "SIZE"]
    const abbrev = parts[1] ?? ''
    const size = parseSize(p.netto ?? parts[2])
    return {
      sku: p.suggested_sku,
      product_name: p.name,
      unit_size: p.netto,
      abbrev,
      size_value: size?.value ?? null,
    }
  })
}

export function fuzzyMatchComponent(
  rawName: string,
  rawNetto: string | number | null,
  candidates: ProductCandidate[],
): ComponentMatchResult {
  const kind = classifyName(rawName)
  if (!kind) {
    return { matched_sku: null, confidence: 'low', reason: 'No product keyword recognised — likely a gift/note' }
  }
  const sameKind = candidates.filter(c => c.abbrev === kind.abbrev)
  if (sameKind.length === 0) {
    return { matched_sku: null, confidence: 'low', reason: `No RSP product matched abbreviation ${kind.abbrev}` }
  }
  if (sameKind.length === 1) {
    return { matched_sku: sameKind[0].sku, confidence: 'high', reason: 'Single matching product' }
  }
  const size = parseSize(rawNetto)
  if (size?.value != null) {
    const exact = sameKind.find(c => c.size_value === size.value)
    if (exact) {
      return { matched_sku: exact.sku, confidence: 'high', reason: `Matched on size ${size.value}` }
    }
    // Nearest size as a fallback
    const nearest = [...sameKind].sort((a, b) => {
      const da = a.size_value == null ? Infinity : Math.abs(a.size_value - size.value)
      const db = b.size_value == null ? Infinity : Math.abs(b.size_value - size.value)
      return da - db
    })[0]
    if (nearest) {
      return { matched_sku: nearest.sku, confidence: 'medium', reason: `No exact size for ${size.value}; closest is ${nearest.size_value}` }
    }
  }
  return { matched_sku: sameKind[0].sku, confidence: 'medium', reason: 'Multiple sizes available; defaulted to first' }
}

// ---- Channel SKU fuzzy match -----------------------------------------------
//
// Used by /api/admin/sku-mapping/suggest. The TikTok seller_sku field can be
// almost anything — a literal internal SKU, a slight variant, or a free-form
// product name. We try each in order:
//   1. Exact internal SKU match (case-insensitive)
//   2. Product-name keyword classify + size inference
//   3. No match → null

export interface ChannelMappingSuggestion {
  external_sku: string
  suggested_internal_sku: string | null
  suggested_product_name: string | null
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export function suggestChannelMapping(
  externalSku: string,
  products: ProductLite[],
): ChannelMappingSuggestion {
  const ext = (externalSku ?? '').trim()
  if (!ext) {
    return { external_sku: externalSku, suggested_internal_sku: null, suggested_product_name: null, confidence: 'low', reason: 'Empty seller_sku' }
  }

  // 1. Exact match
  const upper = ext.toUpperCase()
  const exact = products.find(p => p.sku.toUpperCase() === upper)
  if (exact) {
    return {
      external_sku: externalSku,
      suggested_internal_sku: exact.sku,
      suggested_product_name: exact.product_name,
      confidence: 'high',
      reason: 'Exact SKU match',
    }
  }

  // 2. Bundle string detection (multiple SKUs separated by space) — leave for manual
  if (/\s/.test(ext) && /[A-Z]{2,}-?\d+/i.test(ext)) {
    return {
      external_sku: externalSku,
      suggested_internal_sku: null,
      suggested_product_name: null,
      confidence: 'low',
      reason: 'Looks like a bundle string — needs manual mapping to a bundle SKU',
    }
  }

  // 3. Keyword classify against product names
  const kind = classifyName(ext)
  if (!kind) {
    return { external_sku: externalSku, suggested_internal_sku: null, suggested_product_name: null, confidence: 'low', reason: 'No product keyword recognised' }
  }
  const candidates = products.filter(p => {
    const k = classifyName(p.product_name)
    return k?.abbrev === kind.abbrev
  })
  if (candidates.length === 0) {
    return { external_sku: externalSku, suggested_internal_sku: null, suggested_product_name: null, confidence: 'low', reason: `No product matched ${kind.abbrev}` }
  }
  // Try size disambiguation
  const size = parseSize(ext)
  if (size?.value != null) {
    const exactSize = candidates.find(c => parseSize(c.unit_size)?.value === size.value)
    if (exactSize) {
      return {
        external_sku: externalSku,
        suggested_internal_sku: exactSize.sku,
        suggested_product_name: exactSize.product_name,
        confidence: 'high',
        reason: 'Name + size match',
      }
    }
  }
  if (candidates.length === 1) {
    return {
      external_sku: externalSku,
      suggested_internal_sku: candidates[0].sku,
      suggested_product_name: candidates[0].product_name,
      confidence: 'medium',
      reason: 'Single product matched the keyword',
    }
  }
  return {
    external_sku: externalSku,
    suggested_internal_sku: candidates[0].sku,
    suggested_product_name: candidates[0].product_name,
    confidence: 'medium',
    reason: 'Multiple sizes possible; user should confirm',
  }
}
