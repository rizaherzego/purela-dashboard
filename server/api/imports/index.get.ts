import { getServiceSupabase } from '~~/server/utils/supabase'

export default defineEventHandler(async () => {
  const sb = getServiceSupabase()
  const { data, error } = await sb
    .from('import_batches')
    .select(`
      batch_id, channel_id, file_type_id, file_name, file_hash,
      period_start, period_end, row_count, imported_at, imported_by, notes
    `)
    .order('imported_at', { ascending: false })
    .limit(200)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { batches: data ?? [] }
})
