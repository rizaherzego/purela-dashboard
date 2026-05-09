import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const sku = getRouterParam(event, 'sku')?.toUpperCase()
  if (!sku) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bundle SKU is required.',
    })
  }

  const body = await readBody<{
    bundle_name?: string
    notes?: string | null
    components?: Array<{ component_sku: string; quantity: number }>
  }>(event)

  const sb = await serverSupabaseServiceRole(event)

  // Update bundle basic info
  const updates: Record<string, any> = {}
  if (body.bundle_name != null) updates.bundle_name = body.bundle_name.trim()
  if (body.notes != null) updates.notes = body.notes

  if (Object.keys(updates).length > 0) {
    const { error } = await sb
      .from('bundles')
      .update(updates)
      .eq('bundle_sku', sku)

    if (error) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      })
    }
  }

  // Update components if provided
  if (body.components) {
    // Delete existing components
    await sb.from('bundle_components').delete().eq('bundle_sku', sku)

    // Insert new components
    if (body.components.length > 0) {
      const { error } = await sb
        .from('bundle_components')
        .insert(
          body.components.map((c) => ({
            bundle_sku: sku,
            component_sku: c.component_sku.trim().toUpperCase(),
            quantity: c.quantity,
          }))
        )

      if (error) {
        throw createError({
          statusCode: 400,
          statusMessage: `Failed to update components: ${error.message}`,
        })
      }
    }
  }

  // Return updated bundle
  const { data, error } = await sb
    .from('bundles')
    .select(`*, bundle_components(component_sku, quantity)`)
    .eq('bundle_sku', sku)
    .single()

  if (error) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Bundle not found.',
    })
  }

  return {
    ...data,
    components: data.bundle_components || [],
  }
})
