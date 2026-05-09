// Suggest channel_sku_mapping rows for unmapped seller_sku values.
// Pulls every distinct seller_sku from raw_tiktok_orders that doesn't yet have
// a row in channel_sku_mapping for tiktok_shop, fuzzy-matches it against the
// loaded products, and returns the candidates for user confirmation.

import { serverSupabaseServiceRole } from '#supabase/server'
import { suggestChannelMapping, type ChannelMappingSuggestion } from '~~/server/utils/sku-suggest'

export interface SuggestEntry extends ChannelMappingSuggestion {
  channel_id: string
  sample_product_name_from_orders: string | null
  occurrence_count: number
}

interface SuggestResponse {
  channel_id: string
  total_unmapped: number
  suggestions: SuggestEntry[]
}

export default defineEventHandler(async (event): Promise<SuggestResponse> => {
  const query = getQuery(event)
  const channelId = (query.channel_id as string) ?? 'tiktok_shop'

  const sb = await serverSupabaseServiceRole(event)

  // 1. Pull all products for matching
  const { data: products, error: prodErr } = await sb
    .from('products')
    .select('sku, product_name, unit_size, is_active')
    .eq('is_active', true)
  if (prodErr) throw createError({ statusCode: 500, statusMessage: prodErr.message })

  // 2. Pull existing mappings to exclude
  const { data: existingMappings, error: mapErr } = await sb
    .from('channel_sku_mapping')
    .select('external_sku')
    .eq('channel_id', channelId)
  if (mapErr) throw createError({ statusCode: 500, statusMessage: mapErr.message })
  const mappedSet = new Set((existingMappings ?? []).map(m => m.external_sku))

  // 3. Pull distinct seller_sku from raw_tiktok_orders.
  // Supabase JS doesn't expose DISTINCT directly — we page through with limit
  // and dedupe client-side. SKU master is small, but the orders table can
  // have many rows; cap at 50k pulls to stay safe.
  let sellerSkus: { seller_sku: string, product_name: string | null }[] = []
  if (channelId === 'tiktok_shop') {
    const { data, error } = await sb
      .from('raw_tiktok_orders')
      .select('seller_sku, product_name')
      .not('seller_sku', 'is', null)
      .limit(50000)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    sellerSkus = (data ?? []) as any
  }

  // Aggregate: distinct seller_sku → { count, sample product_name }
  const distinctMap = new Map<string, { count: number, sampleName: string | null }>()
  for (const row of sellerSkus) {
    const key = row.seller_sku
    if (!key || mappedSet.has(key)) continue
    const existing = distinctMap.get(key)
    if (existing) existing.count++
    else distinctMap.set(key, { count: 1, sampleName: row.product_name ?? null })
  }

  // 4. Run suggestions
  const productLite = (products ?? []).map(p => ({
    sku: p.sku,
    product_name: p.product_name,
    unit_size: p.unit_size,
  }))

  const suggestions: SuggestEntry[] = [...distinctMap.entries()].map(([externalSku, agg]) => {
    const sug = suggestChannelMapping(externalSku, productLite)
    return {
      ...sug,
      channel_id: channelId,
      sample_product_name_from_orders: agg.sampleName,
      occurrence_count: agg.count,
    }
  })

  // Sort: high confidence first, then by occurrence count
  suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 } as const
    if (order[a.confidence] !== order[b.confidence]) return order[a.confidence] - order[b.confidence]
    return b.occurrence_count - a.occurrence_count
  })

  return {
    channel_id: channelId,
    total_unmapped: distinctMap.size,
    suggestions,
  }
})
