import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const isBrowser = typeof window !== 'undefined'

declare global {
  var __solarflow_supabase__: ReturnType<typeof createClient<Database>> | undefined
}

export const supabase =
  globalThis.__solarflow_supabase__ ??
  createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: isBrowser,
      autoRefreshToken: false,
      detectSessionInUrl: isBrowser
    }
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__solarflow_supabase__ = supabase
}