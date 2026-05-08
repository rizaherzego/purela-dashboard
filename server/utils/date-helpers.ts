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
