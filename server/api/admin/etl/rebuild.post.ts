// Re-run the fact_orders ETL for one or more channels. Used after the user
// changes reference data (SKU mappings, products, bundles, COGS) and wants
// the existing sales to reflect the new mappings without re-uploading.
//
// Default behaviour with no body: scans import_batches for every distinct
// channel with imports, then runs etl_rebuild_fact_orders for each over the
// full period covered by that channel's batches.
//
// Optional body: { channel_id?: string, date_from?: 'YYYY-MM-DD', date_to?: 'YYYY-MM-DD' }
//   - channel_id given → only that channel
//   - dates given → override the auto-detected range

import { serverSupabaseServiceRole } from '#supabase/server'

interface RebuildBody {
  channel_id?: string
  date_from?: string
  date_to?: string
}

interface ChannelResult {
  channel_id: string
  date_from: string
  date_to: string
  rows_rebuilt: number | null
  error: string | null
}

interface RebuildResponse {
  channels: ChannelResult[]
  total_rows_rebuilt: number
}

export default defineEventHandler(async (event): Promise<RebuildResponse> => {
  const body = await readBody<RebuildBody | null>(event).catch(() => null)
  const sb = await serverSupabaseServiceRole(event)

  // 1. Determine which (channel, period) pairs to rebuild.
  // We aggregate from import_batches because that's the only source of truth
  // for what data has actually been imported.
  const { data: batches, error: bErr } = await sb
    .from('import_batches')
    .select('channel_id, period_start, period_end')
    .not('period_start', 'is', null)
    .not('period_end', 'is', null)

  if (bErr) {
    throw createError({ statusCode: 500, statusMessage: `Failed to read import_batches: ${bErr.message}` })
  }

  // Collapse batches by channel: take min(period_start) and max(period_end).
  const ranges = new Map<string, { from: string, to: string }>()
  for (const b of batches ?? []) {
    if (body?.channel_id && b.channel_id !== body.channel_id) continue
    const existing = ranges.get(b.channel_id)
    if (!existing) {
      ranges.set(b.channel_id, { from: b.period_start!, to: b.period_end! })
    }
    else {
      if (b.period_start! < existing.from) existing.from = b.period_start!
      if (b.period_end! > existing.to) existing.to = b.period_end!
    }
  }

  // If body explicitly named a channel that has no batches, still try to run.
  if (body?.channel_id && !ranges.has(body.channel_id)) {
    if (body.date_from && body.date_to) {
      ranges.set(body.channel_id, { from: body.date_from, to: body.date_to })
    }
    else {
      throw createError({
        statusCode: 400,
        statusMessage: `No imports found for channel ${body.channel_id}. Provide date_from and date_to to force a rebuild.`,
      })
    }
  }

  if (ranges.size === 0) {
    return { channels: [], total_rows_rebuilt: 0 }
  }

  // 2. Run ETL per channel
  const results: ChannelResult[] = []
  let total = 0

  for (const [channelId, range] of ranges) {
    const from = body?.date_from ?? range.from
    const to = body?.date_to ?? range.to

    const { data, error } = await sb.rpc('etl_rebuild_fact_orders', {
      p_channel_id: channelId,
      p_date_from: from,
      p_date_to: to,
    })

    if (error) {
      // Don't fail the whole call — record the per-channel error and continue.
      results.push({
        channel_id: channelId,
        date_from: from,
        date_to: to,
        rows_rebuilt: null,
        error: error.message,
      })
    }
    else {
      const rows = (data as unknown as number) ?? 0
      total += rows
      results.push({
        channel_id: channelId,
        date_from: from,
        date_to: to,
        rows_rebuilt: rows,
        error: null,
      })
    }
  }

  return {
    channels: results,
    total_rows_rebuilt: total,
  }
})
