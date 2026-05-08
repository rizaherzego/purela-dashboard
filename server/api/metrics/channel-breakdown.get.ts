import { serverSupabaseServiceRole } from '#supabase/server'
import { fmtMonth } from '~~/server/utils/date-helpers'

// Contribution margin per channel per month for the last 6 months (stacked bar).
export default defineEventHandler(async (event) => {
  const sb = await serverSupabaseServiceRole(event)

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 6)
  const from = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-01`

  const { data, error } = await sb
    .from('v_audit_fee_waterfall')
    .select('channel_id, month, gross_gmv, net_settlement, contribution_margin')
    .gte('month', from)
    .order('month')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = (data ?? []) as { channel_id: string; month: string; gross_gmv: string; net_settlement: string; contribution_margin: string }[]
  const months   = [...new Set(rows.map(r => r.month))].sort()
  const channels = [...new Set(rows.map(r => r.channel_id))]

  const LABELS: Record<string, string> = {
    tiktok_shop: 'TikTok Shop',
    shopee:      'Shopee',
    tokopedia:   'Tokopedia',
    website:     'Website',
  }

  const series = channels.map(ch => ({
    channel_id: ch,
    label: LABELS[ch] ?? ch,
    gmv: months.map(m => {
      const r = rows.find(d => d.channel_id === ch && d.month === m)
      return r ? Math.round(Number(r.gross_gmv)) : 0
    }),
    cm: months.map(m => {
      const r = rows.find(d => d.channel_id === ch && d.month === m)
      return r ? Math.round(Number(r.contribution_margin)) : 0
    }),
  }))

  return { months, monthLabels: months.map(fmtMonth), series }
})
