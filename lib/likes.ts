import { supabase } from '@/lib/supabase/client'

export async function getAllLikes() {
  const { data, error } = await supabase.from('likes').select('post_id')

  if (error) {
    throw error
  }

  const counts: Record<string, number> = {}

  for (const like of data ?? []) {
    counts[like.post_id] = (counts[like.post_id] || 0) + 1
  }

  return counts
}

export async function getUserLikedPostIds(userId: string) {
  const { data, error } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  return new Set((data ?? []).map((like) => like.post_id))
}

export async function likePost(userId: string, postId: string) {
  const { error } = await supabase.from('likes').insert([
    {
      post_id: postId,
      user_id: userId,
    },
  ])

  if (error) {
    throw error
  }
}

export async function unlikePost(userId: string, postId: string) {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)

  if (error) {
    throw error
  }
}