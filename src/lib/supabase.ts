import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Gera ID compatível com cuid (usado pelo Prisma)
export function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 25)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase credentials not found. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

// Client server-side: usa service role key (bypassa RLS) se disponível,
// senão cai para anon key
export const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Client público (para uso client-side, respeita RLS)
export const supabasePublic = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export function handleSupabaseError(error: any) {
  console.error('Supabase error:', error)
  return {
    error: error.message || 'Database error occurred',
    details: error,
  }
}
