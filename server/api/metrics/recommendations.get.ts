import { serverSupabaseServiceRole } from '#supabase/server'
import { getDateRange } from '~~/server/utils/date-helpers'

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
  const { from, to } = getDateRange(event)
  const recommendations: Recommendation[] = []

  // 1. Low margin SKUs — v_audit_sku_margin is all-time aggregate, so this
  // ignores the date range. (Out of scope to refactor here; matches existing.)
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
  } catch (e) { /* skip */ }

  // 2. High return rate SKUs (RPC scoped to a number-of-days window)
  try {
    const fromD = new Date(from)
    const toD = new Date(to)
    const days = Math.max(1, Math.round((toD.getTime() - fromD.getTime()) / 86_400_000) + 1)
    const { data: highReturnSkus } = await sb.rpc('get_high_return_skus', { days }).limit(3)

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
  } catch (e) { /* RPC may not exist */ }

  // Pull aggregates straight from fact_orders within the range so the
  // shipping/discount/take-rate burdens reflect the selected window.
  try {
    const { data: rows, error } = await sb
      .from('fact_orders')
      .select('channel_id, gross_revenue, seller_discount, voucher_seller_funded, shipping_cost_seller, net_settlement, is_fully_settled')
      .gte('order_date', from)
      .lte('order_date', to)

    if (!error && rows?.length) {
      let gmv = 0, discounts = 0, shipping = 0
      const byChannel = new Map<string, { gross: number; net: number }>()

      for (const r of rows as any[]) {
        const g = Number(r.gross_revenue) || 0
        gmv       += g
        discounts += (Number(r.seller_discount) || 0) + (Number(r.voucher_seller_funded) || 0)
        shipping  += Number(r.shipping_cost_seller) || 0
        if (r.is_fully_settled) {
          const c = byChannel.get(r.channel_id) ?? { gross: 0, net: 0 }
          c.gross += g
          c.net   += Number(r.net_settlement) || 0
          byChannel.set(r.channel_id, c)
        }
      }

      // 3. High shipping cost burden
      if (gmv > 0) {
        const shippingPct = shipping / gmv
        if (shippingPct > 0.15) {
          recommendations.push({
            id: 'high-shipping',
            icon: 'lucide:truck',
            title: 'High shipping cost burden',
            severity: shippingPct > 0.2 ? 'critical' : 'warn',
            message: `Shipping costs represent ${(shippingPct * 100).toFixed(1)}% of GMV. Negotiate rates or adjust pricing.`,
          })
        }

        // 4. High discount burden
        const discountPct = discounts / gmv
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

      // 5. Worst effective take rate by channel
      let worst: { channel: string; rate: number } | null = null
      for (const [ch, c] of byChannel) {
        if (c.gross <= 0) continue
        const rate = (c.gross - c.net) / c.gross
        if (!worst || rate > worst.rate) worst = { channel: ch, rate }
      }
      if (worst && worst.rate > 0.30) {
        recommendations.push({
          id: 'high-take-rate',
          icon: 'lucide:zap',
          title: `${worst.channel} high take rate`,
          severity: worst.rate > 0.40 ? 'critical' : 'warn',
          message: `${worst.channel} effective take rate is ${(worst.rate * 100).toFixed(1)}%. Negotiate better rates or consider shifting volume.`,
          actionUrl: `/channel/${worst.channel === 'tiktok_shop' ? 'tiktok' : worst.channel}`,
        })
      }
    }
  } catch (e) { /* skip */ }

  return { recommendations, range: { from, to } }
})
