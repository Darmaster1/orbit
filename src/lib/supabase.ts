import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const isSupabaseConfigured = Boolean(supabase)

export function subscribeToFamily(familyId: string, onChange: () => void) {
  if (!supabase) return () => undefined
  const channel = supabase.channel(`family:${familyId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `family_id=eq.${familyId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cards', filter: `family_id=eq.${familyId}` }, onChange)
    .subscribe()
  return () => { void supabase.removeChannel(channel) }
}