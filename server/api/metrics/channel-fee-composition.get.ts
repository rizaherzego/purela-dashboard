import { serverSupabaseServiceRole } from '#supabase/server'
import { fmtMonth, getDateRange } from '~~/server/utils/date-helpers'

// Monthly fee-component breakdown as % of GMV for one channel, within range.
// Query params: channel_id (e.g. "tiktok_shop"), from, to
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const channelId = String(query.channel_id || '')
  if (!channelId) throw createError({ statusCode: 400, statusMessage: 'channel_id is required.' })

  const sb = await serverSupabaseServiceRole(event)
  const { from, to } = getDateRange(event)

  const { data, error } = await sb
    .from('fact_orders')
    .select('order_date, gross_revenue, seller_discount, voucher_seller_funded, platform_commission, affiliate_commission, service_fee, transaction_fee, shipping_cost_seller, refund_amount, contribution_margin')
    .eq('channel_id', channelId)
    .gte('order_date', from)
    .lte('order_date', to)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  type Bucket = {
    gross: number
    seller_discounts: number
    platform_commission: number
    affiliate: number
    service_fees: number
    transaction_fees: number
    shipping: number
    refunds: number
    cm: number
  }
  const blank = (): Bucket => ({
    gross: 0, seller_discounts: 0, platform_commission: 0, affiliate: 0,
    service_fees: 0, transaction_fees: 0, shipping: 0, refunds: 0, cm: 0,
  })

  const byMonth = new Map<string, Bucket>()
  for (const r of (data ?? []) as any[]) {
    const month = `${(r.order_date as string).slice(0, 7)}-01`
    const b = byMonth.get(month) ?? blank()
    b.gross               += Number(r.gross_revenue) || 0
    b.seller_discounts    += (Number(r.seller_discount) || 0) + (Number(r.voucher_seller_funded) || 0)
    b.platform_commission += Number(r.platform_commission) || 0
    b.affiliate           += Number(r.affiliate_commission) || 0
    b.service_fees        += Number(r.service_fee) || 0
    b.transaction_fees    += Number(r.transaction_fee) || 0
    b.shipping            += Number(r.shipping_cost_seller) || 0
    b.refunds             += Number(r.refund_amount) || 0
    b.cm                  += Number(r.contribution_margin) || 0
    byMonth.set(month, b)
  }

  const months = [...byMonth.keys()].sort()
  const pct = (key: keyof Bucket) =>
    months.map(m => {
      const b = byMonth.get(m)!
      if (!b.gross) return 0
      return +((Math.abs(b[key]) / b.gross) * 100).toFixed(2)
    })
  const cmPct = months.map(m => {
    const b = byMonth.get(m)!
    if (!b.gross) return 0
    return +((b.cm / b.gross) * 100).toFixed(2)
  })

  return {
    months,
    monthLabels:         months.map(fmtMonth),
    seller_discounts:    pct('seller_discounts'),
    platform_commission: pct('platform_commission'),
    affiliate:           pct('affiliate'),
    service_fees:        pct('service_fees'),
    transaction_fees:    pct('transaction_fees'),
    shipping:            pct('shipping'),
    refunds:             pct('refunds'),
    cm_pct:              cmPct,
    range:               { from, to },
  }
})
