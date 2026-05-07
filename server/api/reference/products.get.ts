import { getServiceSupabase } from '~~/server/utils/supabase'

export default defineEventHandler(async () => {
  const sb = getServiceSupabase()
  const { data: products, error: pErr } = await sb
    .from('products')
    .select('sku, product_name, category, unit_size, weight_grams, is_bundle, is_active')
    .order('sku')

  const { data: costs, error: cErr } = await sb
    .from('product_costs')
    .select('sku, effective_from, effective_to, cogs_per_unit, packaging_per_unit')
    .is('effective_to', null)

  if (pErr || cErr) {
    throw createError({ statusCode: 500, statusMessage: pErr?.message || cErr?.message || 'failed' })
  }

  const costBySku = new Map((costs ?? []).map(c => [c.sku, c]))

  return {
    products: (products ?? []).map(p => ({
      ...p,
      current_cogs: costBySku.get(p.sku)?.cogs_per_unit ?? null,
      current_packaging: costBySku.get(p.sku)?.packaging_per_unit ?? null,
    })),
  }
})
