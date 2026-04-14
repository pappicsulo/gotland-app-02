import { supabase } from '@/lib/supabase/client'

export async function isFollowingUser(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()

  if (error) {
    console.error('isFollowingUser error:', error)
    return false
  }

  return !!data
}

export async function followUser(
  followerId: string,
  followingId: string
) {
  const { error } = await supabase.from('follows').insert([
    {
      follower_id: followerId,
      following_id: followingId,
    },
  ])

  if (error) {
    throw error
  }
}

export async function unfollowUser(
  followerId: string,
  followingId: string
) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)

  if (error) {
    throw error
  }
}

export async function getFollowerCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId)

  if (error) {
    console.error('getFollowerCount error:', error)
    return 0
  }

  return count ?? 0
}

export async function getFollowingCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId)

  if (error) {
    console.error('getFollowingCount error:', error)
    return 0
  }

  return count ?? 0
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)

  if (error) {
    console.error('getFollowingIds error:', error)
    return []
  }

  return (data ?? []).map((row) => row.following_id)
}