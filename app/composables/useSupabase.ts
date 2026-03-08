import type { Database } from '~/types/database.types'

export const useSupabase = () => getSupabaseClient()

export function useSupabaseAuth() {
  const supabase = useSupabase()
  const user = useState<Database['public']['Tables']['profiles']['Row'] | null>('supabase-user', () => null)

  const getUser = async () => {
    const { data: { user: authUser }, error } = await supabase.auth.getUser()
    if (error) {
      console.error('Error fetching user:', error)
      return null
    }
    return authUser
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (!error && data.user) {
      user.value = data.user as any
    }
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      user.value = null
    }
    return { error }
  }

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    return { data, error }
  }

  return {
    user,
    getUser,
    signIn,
    signOut,
    signUp
  }
}
