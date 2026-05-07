import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const sb = await serverSupabaseServiceRole(event)
  const [{ data: bundles, error: bErr }, { data: components, error: cErr }] = await Promise.all([
    sb.from('bundles').select('bundle_sku, bundle_name, notes').order('bundle_sku'),
    sb.from('bundle_components').select('bundle_sku, component_sku, quantity'),
  ])
  if (bErr || cErr) throw createError({ statusCode: 500, statusMessage: bErr?.message || cErr?.message || 'failed' })

  const compsByBundle = new Map<string, { component_sku: string, quantity: number }[]>()
  for (const c of components ?? []) {
    const arr = compsByBundle.get(c.bundle_sku) ?? []
    arr.push({ component_sku: c.component_sku, quantity: c.quantity })
    compsByBundle.set(c.bundle_sku, arr)
  }

  return {
    bundles: (bundles ?? []).map(b => ({
      ...b,
      components: compsByBundle.get(b.bundle_sku) ?? [],
    })),
  }
})
