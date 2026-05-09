import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const sku = getRouterParam(event, 'sku')?.toUpperCase()
  if (!sku) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bundle SKU is required.',
    })
  }

  const sb = await serverSupabaseServiceRole(event)

  // Delete bundle (cascade will handle components)
  const { error } = await sb
    .from('bundles')
    .delete()
    .eq('bundle_sku', sku)

  if (error) {
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 400,
      statusMessage: error.message || 'Failed to delete bundle.',
    })
  }

  return { ok: true }
})
