import { getServiceSupabase } from '~~/server/utils/supabase'

export default defineEventHandler(async () => {
  const sb = getServiceSupabase()

  const [unmapped, missingCogs, unsettled, undefinedBundles] = await Promise.all([
    sb.from('v_dq_unmapped_skus').select('*').limit(50),
    sb.from('v_dq_missing_cogs').select('*').limit(50),
    sb.from('v_dq_unsettled_orders').select('*').limit(50),
    sb.from('v_dq_undefined_bundles').select('*').limit(50),
  ])

  return {
    unmapped_skus: unmapped.data ?? [],
    missing_cogs: missingCogs.data ?? [],
    unsettled_orders: unsettled.data ?? [],
    undefined_bundles: undefinedBundles.data ?? [],
    errors: [unmapped.error, missingCogs.error, unsettled.error, undefinedBundles.error]
      .filter(Boolean)
      .map(e => e!.message),
  }
})
