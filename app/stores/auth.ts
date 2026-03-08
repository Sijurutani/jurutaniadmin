import { defineStore } from 'pinia'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export const useAuthStore = defineStore('auth', () => {
  const supabase = useSupabase()
  const router = useRouter()

  const profile = ref<Profile | null>(null)
  const loading = ref(false)

  // ───── Getters ─────
  const isAuthenticated = computed(() => profile.value !== null)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const displayName = computed(
    () => profile.value?.full_name || profile.value?.username || profile.value?.email || 'Admin'
  )
  const avatarUrl = computed(() => profile.value?.avatar_url || null)

  // ───── Actions ─────
  async function fetchProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) {
      console.error('[auth store] fetchProfile error:', error)
      return null
    }
    return data
  }

  async function signInWithEmail(email: string, password: string): Promise<{ error: string | null }> {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) return { error: error.message }
      if (!data.user) return { error: 'Authentication failed' }

      const userProfile = await fetchProfile(data.user.id)

      if (!userProfile || userProfile.role !== 'admin') {
        await supabase.auth.signOut()
        return { error: 'Access denied. Only admins can access this dashboard.' }
      }

      profile.value = userProfile
      await router.push('/')
      return { error: null }
    }
    finally {
      loading.value = false
    }
  }

  async function signInWithGoogle(): Promise<{ error: string | null }> {
    const origin = window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin}/auth/callback` }
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    profile.value = null
    await navigateTo('/signin')
  }

  async function handleOAuthCallback(): Promise<{ error: string | null }> {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session?.user) {
      return { error: error?.message || 'No session found' }
    }

    const userProfile = await fetchProfile(session.user.id)

    if (!userProfile || userProfile.role !== 'admin') {
      await supabase.auth.signOut()
      return { error: 'Access denied. Only admins can access this dashboard.' }
    }

    profile.value = userProfile
    return { error: null }
  }

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const userProfile = await fetchProfile(session.user.id)
      if (userProfile?.role === 'admin') {
        profile.value = userProfile
      } else {
        await supabase.auth.signOut()
        profile.value = null
      }
    }

    supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const userProfile = await fetchProfile(session.user.id)
        if (userProfile?.role === 'admin') {
          profile.value = userProfile
        } else {
          await supabase.auth.signOut()
          profile.value = null
        }
      } else if (event === 'SIGNED_OUT') {
        profile.value = null
      }
    })
  }

  return {
    // State
    profile,
    loading,
    // Getters
    isAuthenticated,
    isAdmin,
    displayName,
    avatarUrl,
    // Actions
    fetchProfile,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    handleOAuthCallback,
    init
  }
})
