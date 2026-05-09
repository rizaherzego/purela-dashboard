import { serverSupabaseServiceRole } from '#supabase/server'
import { getDateRange, isoWeekKey } from '~~/server/utils/date-helpers'

// Per-channel weekly take-rate trend + take-rate distribution histogram.
// Query params: channel_id (e.g. "tiktok_shop"), from, to
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const channelId = String(query.channel_id || '')
  if (!channelId) throw createError({ statusCode: 400, statusMessage: 'channel_id is required.' })

  const sb = await serverSupabaseServiceRole(event)
  const { from, to } = getDateRange(event)

  const { data, error } = await sb
    .from('fact_orders')
    .select('order_date, gross_revenue, net_settlement')
    .eq('channel_id', channelId)
    .eq('is_fully_settled', true)
    .gte('order_date', from)
    .lte('order_date', to)
    .order('order_date')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const weekBuckets = new Map<string, { gross: number; net: number }>()
  const orderRates: number[] = []

  for (const row of data ?? []) {
    const g = Number(row.gross_revenue) || 0
    const n = Number(row.net_settlement) || 0
    if (g <= 0) continue

    orderRates.push((g - n) / g)

    const key = isoWeekKey(row.order_date)
    const b = weekBuckets.get(key) ?? { gross: 0, net: 0 }
    b.gross += g
    b.net   += n
    weekBuckets.set(key, b)
  }

  const sorted   = [...weekBuckets.entries()].sort(([a], [b]) => a.localeCompare(b))
  const weeks    = sorted.map(([k]) => k)
  const takeRate = sorted.map(([, v]) =>
    v.gross > 0 ? +((v.gross - v.net) / v.gross * 100).toFixed(2) : null,
  )

  // Histogram: 2pp buckets, 0–60%
  const BUCKET_SIZE = 0.02
  const NUM_BUCKETS = 30
  const hist = new Array(NUM_BUCKETS).fill(0)
  for (const r of orderRates) {
    const idx = Math.min(Math.floor(r / BUCKET_SIZE), NUM_BUCKETS - 1)
    if (idx >= 0) hist[idx]++
  }
  const histLabels = Array.from({ length: NUM_BUCKETS }, (_, i) => `${i * 2}–${i * 2 + 2}%`)

  return { weeks, take_rate: takeRate, hist_labels: histLabels, hist_counts: hist }
})
