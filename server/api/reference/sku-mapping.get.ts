import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const sb = await serverSupabaseServiceRole(event)
  const { data, error } = await sb
    .from('channel_sku_mapping')
    .select('channel_id, external_sku, external_product_id, internal_sku')
    .order('channel_id')
    .order('external_sku')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { mappings: data ?? [] }
})
