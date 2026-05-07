import { getServiceSupabase } from '~~/server/utils/supabase'

// Profitability Overview metrics — last 30 days vs prior 30 days.
// Reads from fact_orders directly so the math is consistent with the audit views.
export default defineEventHandler(async () => {
  const sb = getServiceSupabase()

  const today = new Date()
  const day = (offset: number) => {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - offset)
    return d.toISOString().slice(0, 10)
  }
  const periods = {
    current:  { from: day(30), to: day(0) },
    previous: { from: day(60), to: day(31) },
  }

  async function aggregate(from: string, to: string) {
    const { data, error } = await sb
      .from('fact_orders')
      .select('gross_revenue, net_settlement, contribution_margin, order_id, is_fully_settled')
      .gte('order_date', from)
      .lte('order_date', to)

    if (error) throw createError({ statusCode: 500, statusMessage: error.message })

    let gross = 0
    let net = 0
    let cm = 0
    const orderIds = new Set<string>()
    let settledLines = 0
    let settledLinesGross = 0
    let settledLinesNet = 0

    for (const r of data ?? []) {
      gross += Number(r.gross_revenue) || 0
      net   += Number(r.net_settlement) || 0
      cm    += Number(r.contribution_margin) || 0
      orderIds.add(r.order_id)
      if (r.is_fully_settled) {
        settledLines += 1
        settledLinesGross += Number(r.gross_revenue) || 0
        settledLinesNet   += Number(r.net_settlement) || 0
      }
    }

    return {
      gross_revenue: gross,
      net_settlement: net,
      contribution_margin: cm,
      contribution_margin_pct: gross > 0 ? cm / gross : null,
      effective_take_rate: settledLinesGross > 0 ? (settledLinesGross - settledLinesNet) / settledLinesGross : null,
      order_count: orderIds.size,
      line_count: data?.length ?? 0,
    }
  }

  const [current, previous] = await Promise.all([
    aggregate(periods.current.from, periods.current.to),
    aggregate(periods.previous.from, periods.previous.to),
  ])

  // Latest import for the freshness badge
  const { data: lastImport } = await sb
    .from('import_batches')
    .select('channel_id, file_type_id, file_name, period_start, period_end, imported_at')
    .order('imported_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { periods, current, previous, last_import: lastImport ?? null }
})
