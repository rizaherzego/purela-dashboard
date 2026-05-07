import { getServiceSupabase } from '~~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const sb = getServiceSupabase()
  const channelId = getQuery(event).channel as string | undefined

  let q = sb.from('v_audit_sku_margin')
    .select('*')
    .order('total_cm', { ascending: false, nullsFirst: false })
    .limit(200)

  if (channelId) q = q.eq('channel_id', channelId)

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { rows: data ?? [] }
})
