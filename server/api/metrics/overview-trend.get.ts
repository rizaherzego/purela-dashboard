import { serverSupabaseServiceRole } from '#supabase/server'
import { isoWeekKey } from '~~/server/utils/date-helpers'

// Weekly GMV / net settlement / contribution margin for the last 26 weeks.
export default defineEventHandler(async (event) => {
  const sb = await serverSupabaseServiceRole(event)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 26 * 7)
  const from = cutoff.toISOString().slice(0, 10)

  const { data, error } = await sb
    .from('fact_orders')
    .select('order_date, gross_revenue, net_settlement, contribution_margin')
    .gte('order_date', from)
    .order('order_date')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const buckets = new Map<string, { gmv: number; net: number; cm: number }>()

  for (const row of data ?? []) {
    const key = isoWeekKey(row.order_date)
    const b = buckets.get(key) ?? { gmv: 0, net: 0, cm: 0 }
    b.gmv += Number(row.gross_revenue) || 0
    b.net += Number(row.net_settlement) || 0
    b.cm  += Number(row.contribution_margin) || 0
    buckets.set(key, b)
  }

  const sorted = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b))

  return {
    weeks: sorted.map(([k])    => k),
    gmv:   sorted.map(([, v]) => Math.round(v.gmv)),
    net:   sorted.map(([, v]) => Math.round(v.net)),
    cm:    sorted.map(([, v]) => Math.round(v.cm)),
  }
})
