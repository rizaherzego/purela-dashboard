import type { H3Event } from 'h3'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function dayOffset(offset: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - offset)
  return d.toISOString().slice(0, 10)
}

/**
 * Parse `from` / `to` query params from the request. Defaults to the last 30
 * days (inclusive) when either is missing or malformed. Also returns the
 * same-length immediately-prior period for vs-previous comparisons.
 */
export function getDateRange(event: H3Event): {
  from: string
  to: string
  prevFrom: string
  prevTo: string
} {
  const q = getQuery(event)
  const to   = typeof q.to   === 'string' && ISO_DATE.test(q.to)   ? q.to   : dayOffset(0)
  const from = typeof q.from === 'string' && ISO_DATE.test(q.from) ? q.from : dayOffset(30)

  // Same-length prior period (immediately before `from`).
  const fromDate = new Date(from)
  const toDate   = new Date(to)
  const spanDays = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1)
  const prevTo   = new Date(fromDate); prevTo.setUTCDate(prevTo.getUTCDate() - 1)
  const prevFrom = new Date(prevTo);   prevFrom.setUTCDate(prevFrom.getUTCDate() - (spanDays - 1))

  return {
    from,
    to,
    prevFrom: prevFrom.toISOString().slice(0, 10),
    prevTo:   prevTo.toISOString().slice(0, 10),
  }
}

/**
 * Returns an ISO-8601 week key like "2025-W04" for any date string.
 * Week starts Monday; week 1 = first week containing a Thursday.
 */
export function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getUTCDay() || 7             // Sun=0 → 7, Mon=1 … Sat=6
  d.setUTCDate(d.getUTCDate() + 4 - day)    // shift to nearest Thursday
  const year = d.getUTCFullYear()
  const startOfYear = new Date(Date.UTC(year, 0, 1))
  const weekNum = Math.ceil((((d.getTime() - startOfYear.getTime()) / 86_400_000) + 1) / 7)
  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

/** Format "2025-04-01" → "Apr '25" for chart axis labels. */
export function fmtMonth(dateStr: string): string {
  const [y, m] = dateStr.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleString('default', { month: 'short', year: '2-digit' })
}
