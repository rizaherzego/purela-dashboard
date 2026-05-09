// Commit the SKU master upload. Receives the user-edited preview payload
// and writes products, product_costs, bundles, and bundle_components.
// Idempotent — re-running with the same payload upserts rather than failing.

import { serverSupabaseServiceRole } from '#supabase/server'

interface CommitProduct {
  sku: string
  product_name: string
  category: string | null
  netto: string | null
  hpp: number | null
  biaya_lain: number | null
  rsp: number | null
  bottom_price: number | null
}

interface CommitComponent {
  component_sku: string | null
  is_free: boolean
  skip: boolean
  quantity?: number
}

interface CommitBundle {
  bundle_sku: string
  bundle_name: string
  bottom_price: number | null
  mark_up: number | null
  components: CommitComponent[]
}

interface CommitBody {
  products: CommitProduct[]
  bundles: CommitBundle[]
  effective_from?: string         // ISO date; defaults to today
}

interface CommitResponse {
  products_loaded: number
  bundles_loaded: number
  product_costs_loaded: number
  components_loaded: number
  components_skipped: number
}

export default defineEventHandler(async (event): Promise<CommitResponse> => {
  const body = await readBody<CommitBody>(event)
  if (!body || !Array.isArray(body.products) || !Array.isArray(body.bundles)) {
    throw createError({ statusCode: 400, statusMessage: 'products and bundles arrays are required.' })
  }

  // ---- Validate inputs ----
  if (body.products.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No products to commit.' })
  }

  const seenProductSkus = new Set<string>()
  for (const p of body.products) {
    const sku = (p.sku ?? '').trim().toUpperCase()
    if (!sku) throw createError({ statusCode: 400, statusMessage: `Product "${p.product_name}" has no SKU.` })
    if (!/^[A-Z0-9-]+$/.test(sku)) {
      throw createError({ statusCode: 400, statusMessage: `Invalid SKU "${sku}" — only A-Z, 0-9, and "-" allowed.` })
    }
    if (seenProductSkus.has(sku)) {
      throw createError({ statusCode: 400, statusMessage: `Duplicate SKU "${sku}" in products.` })
    }
    seenProductSkus.add(sku)
    if (!p.product_name?.trim()) {
      throw createError({ statusCode: 400, statusMessage: `Product "${sku}" has no name.` })
    }
  }

  const seenBundleSkus = new Set<string>()
  for (const b of body.bundles) {
    const sku = (b.bundle_sku ?? '').trim().toUpperCase()
    if (!sku) throw createError({ statusCode: 400, statusMessage: `Bundle "${b.bundle_name}" has no SKU.` })
    if (seenBundleSkus.has(sku)) {
      throw createError({ statusCode: 400, statusMessage: `Duplicate bundle SKU "${sku}".` })
    }
    if (seenProductSkus.has(sku)) {
      throw createError({ statusCode: 400, statusMessage: `Bundle SKU "${sku}" collides with a product SKU.` })
    }
    seenBundleSkus.add(sku)
  }

  const effectiveFrom = body.effective_from ?? new Date().toISOString().slice(0, 10)
  const sb = await serverSupabaseServiceRole(event)

  // ---- 1. Upsert products (RSP rows, is_bundle=false) ----
  const productRows = body.products.map(p => ({
    sku: p.sku.trim().toUpperCase(),
    product_name: p.product_name.trim(),
    category: emptyToNull(p.category),
    unit_size: emptyToNull(p.netto),
    is_bundle: false,
    is_active: true,
    rsp_price: p.rsp,
    bottom_price: p.bottom_price,
  }))

  {
    const { error } = await sb
      .from('products')
      .upsert(productRows, { onConflict: 'sku' })
    if (error) throw createError({ statusCode: 500, statusMessage: `Products upsert failed: ${error.message}` })
  }

  // ---- 2. Upsert product_costs (SCD; effective_from = today) ----
  const costRows = body.products
    .filter(p => p.hpp != null)
    .map(p => ({
      sku: p.sku.trim().toUpperCase(),
      effective_from: effectiveFrom,
      effective_to: null,
      cogs_per_unit: p.hpp,
      packaging_per_unit: p.biaya_lain ?? 0,
    }))

  if (costRows.length > 0) {
    const { error } = await sb
      .from('product_costs')
      .upsert(costRows, { onConflict: 'sku,effective_from' })
    if (error) throw createError({ statusCode: 500, statusMessage: `Product costs upsert failed: ${error.message}` })
  }

  // ---- 3. Upsert bundle products (is_bundle=true) ----
  const bundleProductRows = body.bundles.map(b => ({
    sku: b.bundle_sku.trim().toUpperCase(),
    product_name: b.bundle_name.trim(),
    category: 'bundle',
    unit_size: null,
    is_bundle: true,
    is_active: true,
    rsp_price: b.mark_up,
    bottom_price: b.bottom_price,
  }))

  if (bundleProductRows.length > 0) {
    const { error } = await sb
      .from('products')
      .upsert(bundleProductRows, { onConflict: 'sku' })
    if (error) throw createError({ statusCode: 500, statusMessage: `Bundle products upsert failed: ${error.message}` })
  }

  // ---- 4. Upsert bundles ----
  const bundleRows = body.bundles.map(b => ({
    bundle_sku: b.bundle_sku.trim().toUpperCase(),
    bundle_name: b.bundle_name.trim(),
  }))

  if (bundleRows.length > 0) {
    const { error } = await sb
      .from('bundles')
      .upsert(bundleRows, { onConflict: 'bundle_sku' })
    if (error) throw createError({ statusCode: 500, statusMessage: `Bundles upsert failed: ${error.message}` })
  }

  // ---- 5. Replace bundle_components for these bundles ----
  // Strategy: delete existing components for each bundle, then insert the new
  // set. Simpler than per-row upsert and avoids stale leftovers when the user
  // edits a bundle on re-import. Components flagged is_free=true OR skip=true
  // OR with no resolved component_sku are excluded entirely.
  const bundleSkus = bundleRows.map(b => b.bundle_sku)
  if (bundleSkus.length > 0) {
    const { error: delErr } = await sb
      .from('bundle_components')
      .delete()
      .in('bundle_sku', bundleSkus)
    if (delErr) throw createError({ statusCode: 500, statusMessage: `bundle_components clear failed: ${delErr.message}` })
  }

  let componentsLoaded = 0
  let componentsSkipped = 0
  const componentRows: { bundle_sku: string, component_sku: string, quantity: number }[] = []

  for (const b of body.bundles) {
    const bundleSku = b.bundle_sku.trim().toUpperCase()
    const accepted = new Map<string, number>()  // component_sku → quantity (handles same component listed twice in a bundle)
    for (const c of b.components) {
      if (c.skip || c.is_free || !c.component_sku) {
        componentsSkipped++
        continue
      }
      const compSku = c.component_sku.trim().toUpperCase()
      if (!seenProductSkus.has(compSku)) {
        // The user-confirmed component_sku must be one of the products we're inserting.
        // (We can't reference an arbitrary internal SKU that wasn't in the upload.)
        componentsSkipped++
        continue
      }
      const qty = c.quantity && c.quantity > 0 ? Math.floor(c.quantity) : 1
      accepted.set(compSku, (accepted.get(compSku) ?? 0) + qty)
    }
    for (const [compSku, qty] of accepted) {
      componentRows.push({ bundle_sku: bundleSku, component_sku: compSku, quantity: qty })
      componentsLoaded++
    }
  }

  if (componentRows.length > 0) {
    const { error } = await sb.from('bundle_components').insert(componentRows)
    if (error) throw createError({ statusCode: 500, statusMessage: `bundle_components insert failed: ${error.message}` })
  }

  return {
    products_loaded: productRows.length,
    bundles_loaded: bundleRows.length,
    product_costs_loaded: costRows.length,
    components_loaded: componentsLoaded,
    components_skipped: componentsSkipped,
  }
})

function emptyToNull(s: string | null | undefined): string | null {
  if (s == null) return null
  const trimmed = String(s).trim()
  return trimmed === '' ? null : trimmed
}
