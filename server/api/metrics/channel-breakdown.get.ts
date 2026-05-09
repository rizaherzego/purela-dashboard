import { serverSupabaseServiceRole } from '#supabase/server'
import { fmtMonth, getDateRange } from '~~/server/utils/date-helpers'

// Contribution margin per channel per month, within the selected date range (stacked bar).
export default defineEventHandler(async (event) => {
  const sb = await serverSupabaseServiceRole(event)
  const { from, to } = getDateRange(event)

  const { data, error } = await sb
    .from('fact_orders')
    .select('channel_id, order_date, gross_revenue, net_settlement, contribution_margin')
    .gte('order_date', from)
    .lte('order_date', to)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = (data ?? []) as { channel_id: string; order_date: string; gross_revenue: string; net_settlement: string; contribution_margin: string }[]

  // Bucket into "YYYY-MM-01" months on the fly.
  type MonthRow = { gmv: number; cm: number }
  const acc = new Map<string, Map<string, MonthRow>>() // channel → month → totals

  for (const r of rows) {
    const month = `${r.order_date.slice(0, 7)}-01`
    let byMonth = acc.get(r.channel_id)
    if (!byMonth) { byMonth = new Map(); acc.set(r.channel_id, byMonth) }
    const cell = byMonth.get(month) ?? { gmv: 0, cm: 0 }
    cell.gmv += Number(r.gross_revenue) || 0
    cell.cm  += Number(r.contribution_margin) || 0
    byMonth.set(month, cell)
  }

  const months = [...new Set(rows.map(r => `${r.order_date.slice(0, 7)}-01`))].sort()
  const channels = [...acc.keys()]

  const LABELS: Record<string, string> = {
    tiktok_shop: 'TikTok Shop',
    shopee:      'Shopee',
    tokopedia:   'Tokopedia',
    website:     'Website',
  }

  const series = channels.map(ch => ({
    channel_id: ch,
    label: LABELS[ch] ?? ch,
    gmv: months.map(m => Math.round(acc.get(ch)?.get(m)?.gmv ?? 0)),
    cm:  months.map(m => Math.round(acc.get(ch)?.get(m)?.cm  ?? 0)),
  }))

  return { months, monthLabels: months.map(fmtMonth), series, range: { from, to } }
})
