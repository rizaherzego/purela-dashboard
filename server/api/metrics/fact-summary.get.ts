import { serverSupabaseServiceRole } from '#supabase/server'

// Diagnostic: how much data is in fact_orders globally and in what date range.
// Pages use this to decide between "your range is empty" vs "no fact data at all"
// when their main query returns zero rows.
export default defineEventHandler(async (event) => {
  const sb = await serverSupabaseServiceRole(event)

  const [countRes, minRes, maxRes] = await Promise.all([
    sb.from('fact_orders').select('fact_order_id', { count: 'exact', head: true }),
    sb.from('fact_orders').select('order_date').order('order_date', { ascending: true  }).limit(1).maybeSingle(),
    sb.from('fact_orders').select('order_date').order('order_date', { ascending: false }).limit(1).maybeSingle(),
  ])

  return {
    total_rows: countRes.count ?? 0,
    min_date:   minRes.data?.order_date ?? null,
    max_date:   maxRes.data?.order_date ?? null,
  }
})
