import { supabase } from '@/lib/supabase/client'

export type NotificationType = 'like' | 'comment' | 'follow'

export async function createNotification(params: {
  type: NotificationType
  fromUserId: string
  toUserId: string
  postId?: string | null
}) {
  if (params.fromUserId === params.toUserId) {
    return
  }

  const { error } = await supabase.from('notifications').insert([
    {
      type: params.type,
      from_user_id: params.fromUserId,
      to_user_id: params.toUserId,
      post_id: params.postId ?? null,
    },
  ])

  if (error) {
    throw error
  }
}