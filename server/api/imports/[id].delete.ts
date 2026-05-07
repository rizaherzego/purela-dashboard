import { getServiceSupabase } from '~~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid batch id.' })
  }

  const sb = getServiceSupabase()

  // Look up the batch first so we can clean up storage and re-run ETL after delete
  const { data: batch, error: lookupErr } = await sb
    .from('import_batches')
    .select('batch_id, channel_id, period_start, period_end, storage_path')
    .eq('batch_id', id)
    .maybeSingle()

  if (lookupErr) {
    throw createError({ statusCode: 500, statusMessage: lookupErr.message })
  }
  if (!batch) {
    throw createError({ statusCode: 404, statusMessage: 'Batch not found.' })
  }

  // Cascade-deletes raw_* rows via ON DELETE CASCADE
  const { error: delErr } = await sb.from('import_batches').delete().eq('batch_id', id)
  if (delErr) {
    throw createError({ statusCode: 500, statusMessage: delErr.message })
  }

  // Best-effort: remove the original file from storage
  if (batch.storage_path) {
    await sb.storage.from('imports').remove([batch.storage_path])
  }

  // Recompute fact_orders for the affected period (without the now-deleted raw rows)
  let factRowsRebuilt: number | null = null
  if (batch.period_start && batch.period_end) {
    const { data, error: etlErr } = await sb.rpc('etl_rebuild_fact_orders', {
      p_channel_id: batch.channel_id,
      p_date_from:  batch.period_start,
      p_date_to:    batch.period_end,
    })
    if (!etlErr) factRowsRebuilt = (data as unknown as number) ?? 0
  }

  return {
    deleted_batch_id: id,
    fact_rows_rebuilt: factRowsRebuilt,
  }
})
