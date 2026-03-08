export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const supabase = useSupabase()
  const authStore = useAuthStore()

  const { data: { session } } = await supabase.auth.getSession()

  const authMeta = to.meta.auth as { only?: string } | undefined
  const isGuestOnly = authMeta?.only === 'guest'

  if (!session?.user) {
    if (!isGuestOnly) {
      return navigateTo('/signin')
    }
    return
  }

  // Session exists – ensure profile is loaded and admin role is validated
  if (!authStore.profile) {
    const userProfile = await authStore.fetchProfile(session.user.id)

    if (!userProfile || userProfile.role !== 'admin') {
      await supabase.auth.signOut()
      if (!isGuestOnly) {
        return navigateTo('/signin')
      }
      return
    }

    authStore.profile = userProfile
  }

  // Authenticated admin trying to access guest-only page → redirect to home
  if (isGuestOnly) {
    return navigateTo('/')
  }
})
