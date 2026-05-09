// Page-level reactive date range. Default = last 30 days.
// `query` is a computed object you spread into a useFetch URL builder so the
// fetch refires when either bound changes.

export function useDateRange() {
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const dayOffset = (offset: number) => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - offset)
    return fmt(d)
  }

  const from = ref(dayOffset(30))
  const to   = ref(dayOffset(0))

  const query = computed(() => ({ from: from.value, to: to.value }))
  const queryString = computed(() => `from=${from.value}&to=${to.value}`)

  return { from, to, query, queryString }
}
