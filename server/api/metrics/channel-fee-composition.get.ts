import { serverSupabaseServiceRole } from '#supabase/server'
import { fmtMonth } from '~~/server/utils/date-helpers'

// Monthly fee-component breakdown as % of GMV for one channel.
// Query param: channel_id (e.g. "tiktok_shop")
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const channelId = String(query.channel_id || '')
  if (!channelId) throw createError({ statusCode: 400, statusMessage: 'channel_id is required.' })

  const sb = await serverSupabaseServiceRole(event)

  const { data, error } = await sb
    .from('v_audit_fee_waterfall')
    .select('month, gross_gmv, seller_funded_discounts, platform_commission, affiliate_commission, service_fees, transaction_fees, shipping_cost_seller, refund_amount, contribution_margin')
    .eq('channel_id', channelId)
    .order('month')
    .limit(12)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const rows = (data ?? []) as Record<string, any>[]
  const months = rows.map(r => r.month as string)

  const pct = (key: string) =>
    rows.map(r => {
      const gmv = Number(r.gross_gmv) || 0
      if (!gmv) return 0
      return +((Math.abs(Number(r[key])) / gmv) * 100).toFixed(2)
    })

  return {
    months,
    monthLabels:         months.map(fmtMonth),
    seller_discounts:    pct('seller_funded_discounts'),
    platform_commission: pct('platform_commission'),
    affiliate:           pct('affiliate_commission'),
    service_fees:        pct('service_fees'),
    transaction_fees:    pct('transaction_fees'),
    shipping:            pct('shipping_cost_seller'),
    refunds:             pct('refund_amount'),
    cm_pct: rows.map(r => {
      const gmv = Number(r.gross_gmv) || 0
      if (!gmv) return 0
      return +((Number(r.contribution_margin) / gmv) * 100).toFixed(2)
    }),
  }
})
