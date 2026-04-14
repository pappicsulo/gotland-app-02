import { supabase } from '@/lib/supabase/client'
import { getFollowingIds } from '@/lib/follows'
import type { Post } from '@/types'

export async function getPosts(currentUserId?: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      image_url,
      caption,
      created_at,
      user_id,
      profiles:profiles!posts_user_id_fkey (
        username,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  let sortedPosts = (data ?? []) as unknown as Post[]

  if (currentUserId) {
    const followingIds = await getFollowingIds(currentUserId)
    const followingSet = new Set(followingIds)

    sortedPosts = [...sortedPosts].sort((a, b) => {
      const aFollowed = a.user_id ? followingSet.has(a.user_id) : false
      const bFollowed = b.user_id ? followingSet.has(b.user_id) : false

      if (aFollowed && !bFollowed) return -1
      if (!aFollowed && bFollowed) return 1
      return 0
    })
  }

  return sortedPosts
}

export async function uploadPostImage(userId: string, imageFile: File): Promise<string> {
  const fileExt = imageFile.name.split('.').pop() || 'jpg'
  const fileName = `${userId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(fileName, imageFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: imageFile.type,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data: publicUrlData } = supabase.storage
    .from('images')
    .getPublicUrl(fileName)

  return publicUrlData.publicUrl
}

export async function createPostRecord(params: {
  userId: string
  imageUrl: string
  caption: string
}) {
  const { error } = await supabase.from('posts').insert([
    {
      user_id: params.userId,
      image_url: params.imageUrl,
      caption: params.caption.trim() || null,
    },
  ])

  if (error) {
    throw error
  }
}