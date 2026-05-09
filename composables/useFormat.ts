// Shared formatters. Locale follows the i18n toggle (en → en-US, id → id-ID).
// Currency is always IDR; only the surface formatting changes.

export function useFormat() {
  const { locale } = useI18n()
  const tag = () => (locale.value === 'id' ? 'id-ID' : 'en-US')
  const rpPrefix = () => (locale.value === 'id' ? 'Rp ' : 'IDR ')

  function formatIDR(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '—'
    return new Intl.NumberFormat(tag(), {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value)
  }

  function formatIDRCompact(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '—'
    const compact = new Intl.NumberFormat(tag(), {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
    return rpPrefix() + compact
  }

  function formatPercent(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '—'
    return new Intl.NumberFormat(tag(), {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(value)
  }

  function formatDate(value: string | Date | null | undefined): string {
    if (!value) return '—'
    const d = typeof value === 'string' ? new Date(value) : value
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat(tag(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d)
  }

  function formatNumber(value: number | null | undefined): string {
    if (value == null || isNaN(value)) return '—'
    return value.toLocaleString(tag())
  }

  return { formatIDR, formatIDRCompact, formatPercent, formatDate, formatNumber }
}
