import { supabase } from '@/lib/supabase/client'

export type UserSearchResult = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const trimmedQuery = query.trim().toLowerCase()

  if (trimmedQuery.length < 2) {
    return []
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, bio')
    .ilike('username', `%${trimmedQuery}%`)
    .limit(20)

  if (error) {
    throw error
  }

  return (data ?? []) as UserSearchResult[]
}