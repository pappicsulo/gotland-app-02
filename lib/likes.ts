import { supabase } from '@/lib/supabase/client'
import { createNotification } from '@/lib/notifications'

export async function getLikeCountsForPosts(postIds: string[]) {
  if (postIds.length === 0) {
    return {}
  }

  const { data, error } = await supabase
    .from('likes')
    .select('post_id')
    .in('post_id', postIds)

  if (error) {
    throw error
  }

  const counts: Record<string, number> = {}

  for (const postId of postIds) {
    counts[postId] = 0
  }

  for (const like of data ?? []) {
    counts[like.post_id] = (counts[like.post_id] || 0) + 1
  }

  return counts
}

export async function getUserLikedPostIds(userId: string, postIds?: string[]) {
  let query = supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId)

  if (postIds && postIds.length > 0) {
    query = query.in('post_id', postIds)
  }

  const { data, error } = await query

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

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('user_id')
    .eq('id', postId)
    .single()

  if (postError || !post?.user_id) return

  await createNotification({
    type: 'like',
    fromUserId: userId,
    toUserId: post.user_id,
    postId,
  })
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