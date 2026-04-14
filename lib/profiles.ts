import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export type EnsureProfileResult = {
  success: boolean
  error?: string
}

function buildInitialUsername(user: User) {
  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    null

  return (
    fullName?.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) ||
    `user${user.id.slice(0, 8)}`
  )
}

export async function ensureUserProfile(
  user: User
): Promise<EnsureProfileResult> {
  const { data: existingProfile, error: selectError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    console.error('ensureUserProfile select error:', selectError)

    return {
      success: false,
      error: selectError.message,
    }
  }

  if (existingProfile) {
    return { success: true }
  }

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    null

  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null

  const baseUsername = buildInitialUsername(user)

  const { error: insertError } = await supabase.from('profiles').insert([
    {
      id: user.id,
      username: baseUsername,
      full_name: fullName,
      avatar_url: avatarUrl,
    },
  ])

  if (insertError) {
    console.error('ensureUserProfile insert error:', insertError)

    return {
      success: false,
      error: insertError.message,
    }
  }

  return { success: true }
}