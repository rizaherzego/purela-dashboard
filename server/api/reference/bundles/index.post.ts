import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    bundle_sku: string
    bundle_name: string
    notes?: string | null
    components?: Array<{ component_sku: string; quantity: number }>
  }>(event)

  if (!body.bundle_sku || !body.bundle_name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bundle SKU and name are required.',
    })
  }

  const sb = await serverSupabaseServiceRole(event)

  // Insert bundle
  const { data: bundle, error: bundleErr } = await sb
    .from('bundles')
    .insert({
      bundle_sku: body.bundle_sku.trim().toUpperCase(),
      bundle_name: body.bundle_name.trim(),
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (bundleErr) {
    throw createError({
      statusCode: bundleErr.code === 'PGRST116' ? 409 : 400,
      statusMessage: bundleErr.code === 'PGRST116' ? 'Bundle SKU already exists.' : bundleErr.message,
    })
  }

  // Insert components if provided
  if (body.components?.length) {
    const { error: compErr } = await sb
      .from('bundle_components')
      .insert(
        body.components.map((c) => ({
          bundle_sku: body.bundle_sku.trim().toUpperCase(),
          component_sku: c.component_sku.trim().toUpperCase(),
          quantity: c.quantity,
        }))
      )

    if (compErr) {
      // Try to clean up the bundle if component insert fails
      await sb.from('bundles').delete().eq('bundle_sku', bundle.bundle_sku)
      throw createError({
        statusCode: 400,
        statusMessage: `Failed to add components: ${compErr.message}`,
      })
    }
  }

  return { ...bundle, components: body.components ?? [] }
})
