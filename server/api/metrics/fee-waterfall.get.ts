import { serverSupabaseServiceRole } from '#supabase/server'
import { getDateRange } from '~~/server/utils/date-helpers'

// Fee waterfall summed across the selected date range, all channels.
// Returns raw amounts (positive numbers); the chart component handles waterfall math.
export default defineEventHandler(async (event) => {
  const sb = await serverSupabaseServiceRole(event)
  const { from, to } = getDateRange(event)

  const { data, error } = await sb
    .from('fact_orders')
    .select('gross_revenue, seller_discount, voucher_seller_funded, platform_commission, affiliate_commission, service_fee, transaction_fee, shipping_cost_seller, refund_amount, net_settlement, cogs, packaging_cost, ads_cost_attributed, contribution_margin')
    .gte('order_date', from)
    .lte('order_date', to)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data?.length) return { range: { from, to }, gross_gmv: 0, seller_funded_discounts: 0, platform_commission: 0, affiliate_commission: 0, service_fees: 0, transaction_fees: 0, shipping_cost_seller: 0, refund_amount: 0, net_settlement: 0, cogs: 0, packaging: 0, ads_attributed: 0, contribution_margin: 0 }

  const sumKey = (key: string) => data.reduce((a: number, r: any) => a + (Number(r[key]) || 0), 0)
  const sumKeys = (...keys: string[]) =>
    data.reduce((a: number, r: any) => a + keys.reduce((s, k) => s + (Number(r[k]) || 0), 0), 0)

  return {
    range: { from, to },
    gross_gmv:                sumKey('gross_revenue'),
    seller_funded_discounts:  sumKeys('seller_discount', 'voucher_seller_funded'),
    platform_commission:      sumKey('platform_commission'),
    affiliate_commission:     sumKey('affiliate_commission'),
    service_fees:             sumKey('service_fee'),
    transaction_fees:         sumKey('transaction_fee'),
    shipping_cost_seller:     sumKey('shipping_cost_seller'),
    refund_amount:            sumKey('refund_amount'),
    net_settlement:           sumKey('net_settlement'),
    cogs:                     sumKey('cogs'),
    packaging:                sumKey('packaging_cost'),
    ads_attributed:           sumKey('ads_cost_attributed'),
    contribution_margin:      sumKey('contribution_margin'),
  }
})
