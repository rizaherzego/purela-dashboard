// Shared formatters. Keep all locale/currency handling in one place.

const idr = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const percent = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
})

const compactIdr = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const dateMed = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export function useFormat() {
  function formatIDR(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '—'
    return idr.format(value)
  }

  function formatIDRCompact(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '—'
    return 'Rp ' + compactIdr.format(value)
  }

  function formatPercent(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '—'
    return percent.format(value)
  }

  function formatDate(value: string | Date | null | undefined): string {
    if (!value) return '—'
    const d = typeof value === 'string' ? new Date(value) : value
    if (isNaN(d.getTime())) return '—'
    return dateMed.format(d)
  }

  function formatNumber(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '—'
    return value.toLocaleString('en-US')
  }

  return { formatIDR, formatIDRCompact, formatPercent, formatDate, formatNumber }
}
