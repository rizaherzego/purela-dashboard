import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    channel_id: string
    external_sku: string
    internal_sku: string
    override_cogs?: number | null
  }>(event)

  if (!body.channel_id || !body.external_sku || !body.internal_sku) {
    throw createError({
      statusCode: 400,
      statusMessage: 'channel_id, external_sku, and internal_sku are required.',
    })
  }

  const sb = await serverSupabaseServiceRole(event)

  const { data, error } = await sb
    .from('channel_sku_mapping')
    .insert({
      channel_id: body.channel_id.trim().toLowerCase(),
      external_sku: body.external_sku.trim().toUpperCase(),
      internal_sku: body.internal_sku.trim().toUpperCase(),
      override_cogs: body.override_cogs ?? null,
    })
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === 'PGRST116' ? 409 : 400,
      statusMessage: error.code === 'PGRST116'
        ? 'Mapping for this channel + external SKU already exists.'
        : error.message,
    })
  }

  return data
})
