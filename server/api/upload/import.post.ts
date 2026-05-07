import { serverSupabaseServiceRole } from '#supabase/server'
import { popStaged } from '~~/server/utils/stage-cache'
import { detectPeriod } from '~~/server/utils/row-mappers'

const BATCH_INSERT_SIZE = 500

export default defineEventHandler(async (event) => {
  const body = await readBody<{ hash?: string }>(event)
  const hash = body?.hash
  if (!hash) {
    throw createError({ statusCode: 400, statusMessage: 'hash is required.' })
  }

  const staged = popStaged(hash)
  if (!staged) {
    throw createError({
      statusCode: 410,
      statusMessage: 'Staged upload expired or not found. Please re-upload.',
    })
  }

  const sb = await serverSupabaseServiceRole(event)

  // 1. Look up file-type metadata to know which raw_* table to write to
  const { data: fileType, error: ftErr } = await sb
    .from('channel_file_types')
    .select('file_type_id, raw_table_name')
    .eq('file_type_id', staged.fileTypeId)
    .single()

  if (ftErr || !fileType) {
    throw createError({ statusCode: 400, statusMessage: 'File type lookup failed.' })
  }

  const period = detectPeriod(staged.fileTypeId, staged.rows)

  // 2. Insert import_batches row
  const { data: batch, error: batchErr } = await sb
    .from('import_batches')
    .insert({
      channel_id:    staged.channelId,
      file_type_id:  staged.fileTypeId,
      file_name:     staged.fileName,
      file_hash:     hash,
      period_start:  period.start,
      period_end:    period.end,
      row_count:     staged.rows.length,
      imported_by:   'shared-login',
    })
    .select('batch_id')
    .single()

  if (batchErr || !batch) {
    throw createError({ statusCode: 500, statusMessage: `Failed to create import batch: ${batchErr?.message}` })
  }

  const batchId = batch.batch_id

  // 3. Upload original file to Storage (best-effort; failures don't kill the import)
  const storagePath = `${batchId}/${staged.fileName}`
  const { error: storageErr } = await sb.storage
    .from('imports')
    .upload(storagePath, staged.rawBytes, { upsert: true })
  if (!storageErr) {
    await sb.from('import_batches').update({ storage_path: storagePath }).eq('batch_id', batchId)
  }

  // 4. Bulk insert into raw_* table with batch_id
  const rowsWithBatch = staged.rows.map(r => ({ ...r, batch_id: batchId }))
  for (let i = 0; i < rowsWithBatch.length; i += BATCH_INSERT_SIZE) {
    const slice = rowsWithBatch.slice(i, i + BATCH_INSERT_SIZE)
    const { error: insErr } = await sb.from(fileType.raw_table_name).insert(slice)
    if (insErr) {
      // Roll back: cascade-delete the batch
      await sb.from('import_batches').delete().eq('batch_id', batchId)
      throw createError({
        statusCode: 500,
        statusMessage: `Insert failed: ${insErr.message}. Batch rolled back.`,
      })
    }
  }

  // 5. Trigger ETL for the affected (channel, period)
  let factRowsRebuilt: number | null = null
  if (period.start && period.end) {
    const { data: etlOut, error: etlErr } = await sb.rpc('etl_rebuild_fact_orders', {
      p_channel_id: staged.channelId,
      p_date_from:  period.start,
      p_date_to:    period.end,
    })
    if (etlErr) {
      console.warn('[etl_rebuild_fact_orders]', etlErr.message)
    } else {
      factRowsRebuilt = (etlOut as unknown as number) ?? 0
    }
  }

  return {
    batch_id: batchId,
    row_count: staged.rows.length,
    period_start: period.start,
    period_end: period.end,
    fact_rows_rebuilt: factRowsRebuilt,
  }
})
