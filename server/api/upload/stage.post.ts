import { serverSupabaseServiceRole } from '#supabase/server'
import { sha256Hex } from '~~/server/utils/file-hash'
import { parseCsv } from '~~/server/utils/parse-csv'
import { parseXlsx } from '~~/server/utils/parse-xlsx'
import { mapRowsForFileType, detectPeriod } from '~~/server/utils/row-mappers'
import { stashStaged } from '~~/server/utils/stage-cache'

const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50MB

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  if (!form) {
    throw createError({ statusCode: 400, statusMessage: 'No multipart form data.' })
  }

  const channelId    = form.find(p => p.name === 'channel_id')?.data?.toString('utf8')
  const fileTypeId   = form.find(p => p.name === 'file_type_id')?.data?.toString('utf8')
  const filePart     = form.find(p => p.name === 'file' && p.filename)
  if (!channelId || !fileTypeId || !filePart) {
    throw createError({ statusCode: 400, statusMessage: 'channel_id, file_type_id and file are required.' })
  }
  if (filePart.data.length > MAX_FILE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'File too large (max 50MB).' })
  }

  const fileName = filePart.filename ?? 'upload'
  const bytes = Buffer.from(filePart.data)
  const hash = sha256Hex(bytes)

  const sb = await serverSupabaseServiceRole(event)

  // 1. Duplicate check
  const { data: existing } = await sb
    .from('import_batches')
    .select('batch_id, channel_id, file_type_id, file_name, period_start, period_end, row_count, imported_at')
    .eq('file_hash', hash)
    .maybeSingle()

  if (existing) {
    return {
      duplicate: true,
      existing,
      hash,
    }
  }

  // 2. Validate file type registration
  const { data: fileType, error: ftErr } = await sb
    .from('channel_file_types')
    .select('file_type_id, channel_id, raw_table_name, expected_headers, display_name')
    .eq('file_type_id', fileTypeId)
    .single()

  if (ftErr || !fileType) {
    throw createError({ statusCode: 400, statusMessage: `Unknown file type: ${fileTypeId}` })
  }
  if (fileType.channel_id !== channelId) {
    throw createError({ statusCode: 400, statusMessage: 'File type does not belong to this channel.' })
  }

  // 3. Parse
  const isXlsx = /\.xlsx?$/i.test(fileName)
  const parsed = isXlsx
    ? parseXlsx(bytes, fileTypeId === 'tiktok_income' ? 'Order details' : undefined)
    : parseCsv(bytes)

  if (parsed.rowCount === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No rows detected in this file.' })
  }

  // 4. Header diff
  const expected: string[] = (fileType.expected_headers as string[]) ?? []
  const expectedTrimmed = new Set(expected.map(h => h.trim()))
  const actualTrimmed = new Set(parsed.headers.map(h => h.trim()))
  const missing = [...expectedTrimmed].filter(h => !actualTrimmed.has(h))
  const extra = [...actualTrimmed].filter(h => !expectedTrimmed.has(h)).slice(0, 20)

  // 5. Map rows + detect period
  const mappedRows = mapRowsForFileType(fileTypeId, parsed.rows)
  const period = detectPeriod(fileTypeId, mappedRows)

  // 6. Stash for confirm
  stashStaged(hash, {
    rows: mappedRows,
    rawBytes: bytes,
    fileName,
    fileTypeId,
    channelId,
  })

  return {
    duplicate: false,
    hash,
    file_name: fileName,
    file_type: { id: fileType.file_type_id, display_name: fileType.display_name, raw_table_name: fileType.raw_table_name },
    row_count: parsed.rowCount,
    period_start: period.start,
    period_end: period.end,
    missing_columns: missing,
    extra_columns: extra,
    sample_rows: parsed.rows.slice(0, 5),
  }
})
