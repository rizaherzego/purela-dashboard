import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    sku: string
    product_name: string
    category?: string | null
    unit_size?: string | null
    weight_grams?: number | null
    is_bundle?: boolean
    is_active?: boolean
    current_cogs?: number | null
    current_packaging?: number | null
  }>(event)

  if (!body.sku || !body.product_name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'SKU and product_name are required.',
    })
  }

  const sb = await serverSupabaseServiceRole(event)

  const { data, error } = await sb
    .from('products')
    .insert({
      sku: body.sku.trim().toUpperCase(),
      product_name: body.product_name.trim(),
      category: body.category ?? null,
      unit_size: body.unit_size ?? null,
      weight_grams: body.weight_grams ?? null,
      is_bundle: body.is_bundle ?? false,
      is_active: body.is_active ?? true,
      current_cogs: body.current_cogs ?? null,
      current_packaging: body.current_packaging ?? null,
    })
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === 'PGRST116' ? 409 : 400,
      statusMessage: error.code === 'PGRST116' ? `SKU "${body.sku}" already exists.` : error.message,
    })
  }

  return data
})
