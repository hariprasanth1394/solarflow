import { supabase } from '../lib/supabaseClient'

export const signInWithPassword = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password })
}

export const signOutCurrentSession = async () => {
  return supabase.auth.signOut()
}

export const fetchCurrentUser = async () => {
  return supabase.auth.getUser()
}

export const fetchCurrentSession = async () => {
  return supabase.auth.getSession()
}

export const subscribeToAuthChanges = (
  callback: (user: unknown) => void
) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
}
