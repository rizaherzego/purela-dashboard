import { serverSupabaseServiceRole } from '#supabase/server'

interface Recommendation {
  id: string
  icon: string
  title: string
  severity: 'info' | 'warn' | 'critical'
  message: string
  value?: string | number
  actionUrl?: string
}

export default defineEventHandler(async (event) => {
  const sb = await serverSupabaseServiceRole(event)
  const recommendations: Recommendation[] = []

  // Last 30 days date range
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const dateFrom = thirtyDaysAgo.toISOString().split('T')[0]

  // 1. Low margin SKUs
  try {
    const { data: lowMarginSkus } = await sb
      .from('v_audit_sku_margin')
      .select('sku, product_name, contribution_margin_pct, gmv')
      .lt('contribution_margin_pct', 10)
      .gt('gmv', 0)
      .order('contribution_margin_pct')
      .limit(3)

    if (lowMarginSkus?.length) {
      const totalGmv = lowMarginSkus.reduce((sum: number, s: any) => sum + (s.gmv ?? 0), 0)
      recommendations.push({
        id: 'low-margin',
        icon: 'lucide:trending-down',
        title: 'Low margin SKUs',
        severity: 'warn',
        message: `${lowMarginSkus.length} SKU(s) with <10% contribution margin. Top impact: ${lowMarginSkus[0].sku} at ${(lowMarginSkus[0].contribution_margin_pct * 100).toFixed(1)}%.`,
        value: `Rp ${(totalGmv / 1_000_000).toFixed(0)}M GMV`,
        actionUrl: '/sku',
      })
    }
  } catch (e) {
    // Silently skip if query fails
  }

  // 2. High return rate SKUs (requires fact_orders with return status)
  try {
    const { data: highReturnSkus } = await sb.rpc('get_high_return_skus', { days: 30 }).limit(3)

    if (highReturnSkus?.length) {
      recommendations.push({
        id: 'high-returns',
        icon: 'lucide:arrow-left-circle',
        title: 'High return SKUs',
        severity: 'critical',
        message: `${highReturnSkus[0].sku} has ${(highReturnSkus[0].return_pct * 100).toFixed(1)}% return rate. Review product quality or description.`,
        actionUrl: '/sku',
      })
    }
  } catch (e) {
    // RPC might not exist yet — skip gracefully
  }

  // 3. High shipping cost impact (from fee waterfall)
  try {
    const { data: feeData } = await sb
      .from('v_audit_fee_waterfall')
      .select('gross_gmv, shipping_cost_seller')
      .gte('date', dateFrom)
      .limit(1)
      .single()

    if (feeData && feeData.gross_gmv > 0) {
      const shippingPct = feeData.shipping_cost_seller / feeData.gross_gmv
      if (shippingPct > 0.15) {
        recommendations.push({
          id: 'high-shipping',
          icon: 'lucide:truck',
          title: 'High shipping cost burden',
          severity: shippingPct > 0.2 ? 'critical' : 'warn',
          message: `Shipping costs represent ${(shippingPct * 100).toFixed(1)}% of GMV. Negotiate rates or adjust pricing.`,
        })
      }
    }
  } catch (e) {
    // Skip if query fails
  }

  // 4. High discount burden
  try {
    const { data: discountData } = await sb
      .from('v_audit_fee_waterfall')
      .select('gross_gmv, seller_funded_discounts')
      .gte('date', dateFrom)
      .limit(1)
      .single()

    if (discountData && discountData.gross_gmv > 0) {
      const discountPct = discountData.seller_funded_discounts / discountData.gross_gmv
      if (discountPct > 0.15) {
        recommendations.push({
          id: 'high-discounts',
          icon: 'lucide:percent',
          title: 'High discount intensity',
          severity: discountPct > 0.25 ? 'critical' : 'warn',
          message: `Seller discounts are ${(discountPct * 100).toFixed(1)}% of GMV. Consider reducing promotional intensity.`,
        })
      }
    }
  } catch (e) {
    // Skip
  }

  // 5. High effective take rate by channel
  try {
    const { data: channelTakeRates } = await sb
      .from('v_audit_take_rate')
      .select('channel_id, effective_take_rate_pct')
      .gte('date', dateFrom)
      .order('effective_take_rate_pct', { ascending: false })
      .limit(1)

    if (channelTakeRates?.length && channelTakeRates[0].effective_take_rate_pct > 30) {
      const ch = channelTakeRates[0]
      recommendations.push({
        id: 'high-take-rate',
        icon: 'lucide:zap',
        title: `${ch.channel_id} high take rate`,
        severity: ch.effective_take_rate_pct > 40 ? 'critical' : 'warn',
        message: `${ch.channel_id} effective take rate is ${(ch.effective_take_rate_pct * 100).toFixed(1)}%. Negotiate better rates or consider shifting volume.`,
        actionUrl: `/channel/${ch.channel_id === 'tiktok_shop' ? 'tiktok' : ch.channel_id}`,
      })
    }
  } catch (e) {
    // Skip
  }

  return { recommendations }
})
