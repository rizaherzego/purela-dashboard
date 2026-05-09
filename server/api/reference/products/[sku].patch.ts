import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const sku = getRouterParam(event, 'sku')?.toUpperCase()
  if (!sku) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SKU is required.',
    })
  }

  const body = await readBody<{
    product_name?: string
    category?: string | null
    unit_size?: string | null
    weight_grams?: number | null
    is_bundle?: boolean
    is_active?: boolean
    current_cogs?: number | null
    current_packaging?: number | null
  }>(event)

  // Build update object with only provided fields
  const updates: Record<string, any> = {}
  if (body.product_name != null) updates.product_name = body.product_name.trim()
  if (body.category != null) updates.category = body.category
  if (body.unit_size != null) updates.unit_size = body.unit_size
  if (body.weight_grams != null) updates.weight_grams = body.weight_grams
  if (body.is_bundle != null) updates.is_bundle = body.is_bundle
  if (body.is_active != null) updates.is_active = body.is_active
  if (body.current_cogs != null) updates.current_cogs = body.current_cogs
  if (body.current_packaging != null) updates.current_packaging = body.current_packaging

  if (Object.keys(updates).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No fields to update.',
    })
  }

  const sb = await serverSupabaseServiceRole(event)

  const { data, error } = await sb
    .from('products')
    .update(updates)
    .eq('sku', sku)
    .select()
    .single()

  if (error || !data) {
    throw createError({
      statusCode: error?.code === 'PGRST116' ? 404 : 400,
      statusMessage: error?.message || 'Product not found.',
    })
  }

  return data
})
