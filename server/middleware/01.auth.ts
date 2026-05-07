// Server middleware: gate every request behind a valid session.
// Exempt: /login page, /api/auth/login (the only way in), /api/_supabase/ (module internals).

const PUBLIC_PATHS = new Set([
  '/login',
  '/api/auth/login',
])

const PUBLIC_PREFIXES = [
  '/_nuxt/',
  '/_ipx/',
  '/__nuxt',
  '/__nuxt_devtools__',
  '/api/_supabase/',
  '/favicon',
]

export default defineEventHandler(async (event) => {
  const path = event.path || event.node.req.url || '/'
  const cleanPath = path.split('?')[0]

  if (PUBLIC_PATHS.has(cleanPath)) return
  if (PUBLIC_PREFIXES.some(prefix => cleanPath.startsWith(prefix))) return

  const session = await getUserSession(event)
  if (session?.user) return

  // For API requests: 401 JSON. For page requests: redirect to /login.
  if (cleanPath.startsWith('/api/')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
    })
  }

  return sendRedirect(event, '/login', 302)
})
