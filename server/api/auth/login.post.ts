import { safeCompare } from '~~/server/utils/constant-time-compare'
import {
  isBlocked,
  recordFailure,
  recordSuccess,
  getRetryAfterSeconds,
} from '~~/server/utils/rate-limit'

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'

  if (isBlocked(ip)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many failed attempts. Try again later.',
      data: { retryAfterSeconds: getRetryAfterSeconds(ip) },
    })
  }

  const body = await readBody<{ password?: string }>(event)
  const submitted = String(body?.password ?? '')
  const expected = useRuntimeConfig().dashboardPassword

  if (!expected) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Dashboard password is not configured on the server.',
    })
  }

  if (!submitted || !safeCompare(submitted, expected)) {
    const result = recordFailure(ip)
    if (result.blocked) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many failed attempts. Try again in 30 minutes.',
      })
    }
    throw createError({
      statusCode: 401,
      statusMessage: 'Incorrect password.',
    })
  }

  recordSuccess(ip)

  await setUserSession(event, {
    user: { name: 'shared-login' },
    loggedInAt: new Date().toISOString(),
  })

  return { ok: true }
})
