import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid mapping ID is required.',
    })
  }

  const sb = await serverSupabaseServiceRole(event)

  const { error } = await sb
    .from('channel_sku_mapping')
    .delete()
    .eq('id', parseInt(id))

  if (error) {
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 400,
      statusMessage: error.message || 'Failed to delete mapping.',
    })
  }

  return { ok: true }
})
