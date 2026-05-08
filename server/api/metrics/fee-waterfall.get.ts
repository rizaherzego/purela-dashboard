import { serverSupabaseServiceRole } from '#supabase/server'

// Fee waterfall for the most recent fully-settled month, aggregated across channels.
// Returns raw amounts (positive numbers); the chart component handles the waterfall math.
export default defineEventHandler(async (event) => {
  const sb = await serverSupabaseServiceRole(event)

  const { data, error } = await sb
    .from('v_audit_fee_waterfall')
    .select('month, gross_gmv, seller_funded_discounts, platform_commission, affiliate_commission, service_fees, transaction_fees, shipping_cost_seller, refund_amount, net_settlement, cogs, packaging, ads_attributed, contribution_margin')
    .order('month', { ascending: false })
    .limit(20) // fetch a few months, keep the latest

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  if (!data?.length) return { month: null }

  // Use the most recent month; sum across all channels
  const latestMonth = (data[0] as any).month as string
  const rows = data.filter((r: any) => r.month === latestMonth)
  const sum = (key: string) => rows.reduce((a: number, r: any) => a + (Number(r[key]) || 0), 0)

  return {
    month:                    latestMonth,
    gross_gmv:                sum('gross_gmv'),
    seller_funded_discounts:  sum('seller_funded_discounts'),
    platform_commission:      sum('platform_commission'),
    affiliate_commission:     sum('affiliate_commission'),
    service_fees:             sum('service_fees'),
    transaction_fees:         sum('transaction_fees'),
    shipping_cost_seller:     sum('shipping_cost_seller'),
    refund_amount:            sum('refund_amount'),
    net_settlement:           sum('net_settlement'),
    cogs:                     sum('cogs'),
    packaging:                sum('packaging'),
    ads_attributed:           sum('ads_attributed'),
    contribution_margin:      sum('contribution_margin'),
  }
})
