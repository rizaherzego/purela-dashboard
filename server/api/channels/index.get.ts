import { getServiceSupabase } from '~~/server/utils/supabase'

// Returns channels with their available file types — drives the upload picker.
export default defineEventHandler(async () => {
  const sb = getServiceSupabase()

  const [{ data: channels, error: chErr }, { data: fileTypes, error: ftErr }] = await Promise.all([
    sb.from('channels').select('channel_id, channel_name, is_marketplace').order('channel_name'),
    sb.from('channel_file_types').select('file_type_id, channel_id, display_name, description').eq('is_active', true).order('display_name'),
  ])

  if (chErr || ftErr) {
    throw createError({
      statusCode: 500,
      statusMessage: chErr?.message || ftErr?.message || 'Failed to load channels',
    })
  }

  return {
    channels: (channels ?? []).map(c => ({
      ...c,
      file_types: (fileTypes ?? []).filter(ft => ft.channel_id === c.channel_id),
    })),
  }
})
