import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || isNaN(parseInt(id))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Valid mapping ID is required.',
    })
  }

  const body = await readBody<{
    internal_sku?: string
    override_cogs?: number | null
  }>(event)

  const updates: Record<string, any> = {}
  if (body.internal_sku != null) updates.internal_sku = body.internal_sku.trim().toUpperCase()
  if (body.override_cogs != null) updates.override_cogs = body.override_cogs

  if (Object.keys(updates).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No fields to update.',
    })
  }

  const sb = await serverSupabaseServiceRole(event)

  const { data, error } = await sb
    .from('channel_sku_mapping')
    .update(updates)
    .eq('id', parseInt(id))
    .select()
    .single()

  if (error || !data) {
    throw createError({
      statusCode: error?.code === 'PGRST116' ? 404 : 400,
      statusMessage: error?.message || 'Mapping not found.',
    })
  }

  return data
})
