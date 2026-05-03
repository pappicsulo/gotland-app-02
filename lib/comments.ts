import { supabase } from '@/lib/supabase/client'
import { createNotification } from '@/lib/notifications'
import type { Comment } from '@/types'

const COMMENT_SELECT = `
  id,
  created_at,
  post_id,
  user_id,
  content,
  profiles:profiles!comments_user_id_fkey (
    username,
    avatar_url
  )
`

export async function getCommentsByPostId(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as unknown as Comment[]
}

export async function createComment(params: {
  postId: string
  userId: string
  content: string
}): Promise<Comment> {
  const trimmedContent = params.content.trim()

  if (!trimmedContent) {
    throw new Error('Comment content is required.')
  }

  const { data, error } = await supabase
    .from('comments')
    .insert([
      {
        post_id: params.postId,
        user_id: params.userId,
        content: trimmedContent,
      },
    ])
    .select(COMMENT_SELECT)
    .single()

  if (error) {
    throw error
  }

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('user_id')
    .eq('id', params.postId)
    .single()

  if (!postError && post?.user_id) {
    await createNotification({
      type: 'comment',
      fromUserId: params.userId,
      toUserId: post.user_id,
      postId: params.postId,
    })
  }

  return data as unknown as Comment
}

export async function deleteComment(params: {
  commentId: string
  userId: string
}) {
  const { data, error } = await supabase
    .from('comments')
    .delete()
    .eq('id', params.commentId)
    .eq('user_id', params.userId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Comment could not be deleted. This usually means your database delete policy is blocking the action.'
    )
  }
}