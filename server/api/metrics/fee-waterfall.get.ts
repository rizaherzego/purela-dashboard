import { serverSupabaseServiceRole } from '#supabase/server'
import { getDateRange } from '~~/server/utils/date-helpers'

// Fee waterfall summed across the selected date range.
// Optional filters: channel (comma-separated channel_ids), sku (comma-separated SKUs).
// Returns raw amounts (positive numbers); the chart component handles waterfall math.
export default defineEventHandler(async (event) => {
  const sb = await serverSupabaseServiceRole(event)
  const { from, to } = getDateRange(event)
  const query = getQuery(event)

  // Optional channel filter — comma-separated list of channel_ids
  const channelParam = String(query.channel ?? '').trim()
  const channels = channelParam ? channelParam.split(',').map(c => c.trim()).filter(Boolean) : []

  // Optional SKU filter — comma-separated list of internal SKUs
  const skuParam = String(query.sku ?? '').trim()
  const skus = skuParam ? skuParam.split(',').map(s => s.trim()).filter(Boolean) : []

  let q = sb
    .from('fact_orders')
    .select('order_id, gross_revenue, seller_discount, voucher_seller_funded, platform_commission, affiliate_commission, service_fee, transaction_fee, shipping_cost_seller, refund_amount, net_settlement, cogs, packaging_cost, ads_cost_attributed, contribution_margin')
    .gte('order_date', from)
    .lte('order_date', to)

  if (channels.length === 1) q = q.eq('channel_id', channels[0])
  else if (channels.length > 1) q = q.in('channel_id', channels)

  if (skus.length === 1) q = q.eq('sku', skus[0])
  else if (skus.length > 1) q = q.in('sku', skus)

  const { data, error } = await q

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const filters = { channels, skus }
  if (!data?.length) return { range: { from, to }, filters, order_count: 0, gross_gmv: 0, seller_funded_discounts: 0, platform_commission: 0, affiliate_commission: 0, service_fees: 0, transaction_fees: 0, shipping_cost_seller: 0, refund_amount: 0, net_settlement: 0, cogs: 0, packaging: 0, ads_attributed: 0, contribution_margin: 0 }

  const sumKey = (key: string) => data.reduce((a: number, r: any) => a + (Number(r[key]) || 0), 0)
  const sumKeys = (...keys: string[]) =>
    data.reduce((a: number, r: any) => a + keys.reduce((s, k) => s + (Number(r[k]) || 0), 0), 0)

  // Distinct order count for the filtered range. fact_orders may have one row
  // per line item, so we dedupe on order_id. This becomes the denominator for
  // "average revenue per order" displayed inside the Gross GMV KPI.
  const uniqueOrders = new Set<string>()
  for (const r of data as any[]) {
    if (r.order_id) uniqueOrders.add(String(r.order_id))
  }
  const orderCount = uniqueOrders.size || data.length

  return {
    range: { from, to },
    filters,
    order_count:              orderCount,
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
