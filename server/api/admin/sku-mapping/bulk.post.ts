// Bulk-create channel_sku_mapping rows after the user has confirmed
// suggestions in the SkuMappingSuggester UI. Accepts an array of mappings
// to insert; uses upsert so re-running is safe.

import { serverSupabaseServiceRole } from '#supabase/server'

interface BulkMappingRow {
  channel_id: string
  external_sku: string
  internal_sku: string
}

interface BulkBody {
  mappings: BulkMappingRow[]
}

interface BulkResponse {
  inserted: number
  skipped: number
  errors: { external_sku: string, message: string }[]
}

export default defineEventHandler(async (event): Promise<BulkResponse> => {
  const body = await readBody<BulkBody>(event)
  if (!body || !Array.isArray(body.mappings)) {
    throw createError({ statusCode: 400, statusMessage: 'mappings array is required.' })
  }

  const cleaned: BulkMappingRow[] = []
  const errors: { external_sku: string, message: string }[] = []

  for (const m of body.mappings) {
    const channelId = (m.channel_id ?? '').trim().toLowerCase()
    const externalSku = (m.external_sku ?? '').trim()
    const internalSku = (m.internal_sku ?? '').trim().toUpperCase()
    if (!channelId || !externalSku || !internalSku) {
      errors.push({ external_sku: externalSku || '(empty)', message: 'Missing channel_id, external_sku, or internal_sku' })
      continue
    }
    cleaned.push({ channel_id: channelId, external_sku: externalSku, internal_sku: internalSku })
  }

  if (cleaned.length === 0) {
    return { inserted: 0, skipped: body.mappings.length, errors }
  }

  const sb = await serverSupabaseServiceRole(event)

  // Upsert so re-running the suggester doesn't fail on rows that were already
  // approved earlier.
  const { error, count } = await sb
    .from('channel_sku_mapping')
    .upsert(cleaned, { onConflict: 'channel_id,external_sku', count: 'exact' })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: `Bulk mapping insert failed: ${error.message}` })
  }

  return {
    inserted: count ?? cleaned.length,
    skipped: body.mappings.length - cleaned.length,
    errors,
  }
})
