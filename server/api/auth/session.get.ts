export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  return {
    authenticated: Boolean(session?.user),
    loggedInAt: session?.loggedInAt ?? null,
  }
})
