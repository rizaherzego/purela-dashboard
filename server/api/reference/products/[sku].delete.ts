import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const sku = getRouterParam(event, 'sku')?.toUpperCase()
  if (!sku) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SKU is required.',
    })
  }

  const sb = await serverSupabaseServiceRole(event)

  // First, check if this SKU is used in any bundles or mappings
  const { data: bundleUsage } = await sb
    .from('bundle_components')
    .select('id')
    .eq('component_sku', sku)
    .limit(1)

  const { data: mappingUsage } = await sb
    .from('channel_sku_mapping')
    .select('id')
    .or(`internal_sku.eq.${sku},external_sku.eq.${sku}`)
    .limit(1)

  const warnings: string[] = []
  if (bundleUsage?.length) warnings.push('This SKU is used as a bundle component.')
  if (mappingUsage?.length) warnings.push('This SKU has channel mappings.')

  const { error } = await sb
    .from('products')
    .delete()
    .eq('sku', sku)

  if (error) {
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 400,
      statusMessage: error.message || 'Failed to delete product.',
    })
  }

  return {
    ok: true,
    warnings,
  }
})
