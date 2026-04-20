import { supabase } from '@/lib/supabase/client'
import { getFollowingIds } from '@/lib/follows'
import type { Post, UploadStatus } from '@/types'

const POST_SELECT = `
  id,
  media_type,
  image_url,
  video_url,
  video_duration,
  caption,
  created_at,
  user_id,
  audio_url,
  audio_start,
  audio_duration,
  upload_status,
  processing_error,
  source_video_url,
  profiles:profiles!posts_user_id_fkey (
    username,
    avatar_url
  )
`

export async function getPosts(currentUserId?: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(POST_SELECT)
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

export async function uploadPostImage(
  userId: string,
  imageFile: File
): Promise<string> {
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

export async function uploadPostVideo(
  userId: string,
  videoFile: File
): Promise<string> {
  const fileExt = 'mp4'
  const fileName = `${userId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(fileName, videoFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'video/mp4',
    })

  if (uploadError) {
    throw uploadError
  }

  const { data: publicUrlData } = supabase.storage
    .from('videos')
    .getPublicUrl(fileName)

  return publicUrlData.publicUrl
}

export async function createPostRecord(params: {
  userId: string
  mediaType: 'image' | 'video'
  imageUrl?: string | null
  videoUrl?: string | null
  videoDuration?: number | null
  caption: string
  audioUrl?: string | null
  audioStart?: number
  audioDuration?: number
  uploadStatus?: UploadStatus
  processingError?: string | null
  sourceVideoUrl?: string | null
}): Promise<Post> {
  const insertPayload =
    params.mediaType === 'video'
      ? {
          user_id: params.userId,
          media_type: 'video' as const,
          image_url: null,
          video_url: params.videoUrl ?? null,
          video_duration: params.videoDuration ?? null,
          caption: params.caption.trim() || null,
          audio_url: null,
          audio_start: 0,
          audio_duration: 0,
          upload_status: params.uploadStatus ?? 'ready',
          processing_error: params.processingError ?? null,
          source_video_url: params.sourceVideoUrl ?? null,
        }
      : {
          user_id: params.userId,
          media_type: 'image' as const,
          image_url: params.imageUrl ?? null,
          video_url: null,
          video_duration: null,
          caption: params.caption.trim() || null,
          audio_url: params.audioUrl ?? null,
          audio_start: params.audioStart ?? 0,
          audio_duration: params.audioDuration ?? 10,
          upload_status: params.uploadStatus ?? 'ready',
          processing_error: params.processingError ?? null,
          source_video_url: null,
        }

  const { data, error } = await supabase
    .from('posts')
    .insert([insertPayload])
    .select(POST_SELECT)
    .single()

  if (error) {
    throw error
  }

  return data as unknown as Post
}

export async function updatePostProcessingState(params: {
  postId: string
  userId: string
  uploadStatus: UploadStatus
  processingError?: string | null
  sourceVideoUrl?: string | null
  videoUrl?: string | null
  videoDuration?: number | null
}): Promise<Post> {
  const updatePayload = {
    upload_status: params.uploadStatus,
    processing_error: params.processingError ?? null,
    source_video_url:
      params.sourceVideoUrl === undefined ? undefined : params.sourceVideoUrl,
    video_url: params.videoUrl === undefined ? undefined : params.videoUrl,
    video_duration:
      params.videoDuration === undefined ? undefined : params.videoDuration,
  }

  const { data, error } = await supabase
    .from('posts')
    .update(updatePayload)
    .eq('id', params.postId)
    .eq('user_id', params.userId)
    .select(POST_SELECT)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Post could not be updated. This usually means your database update policy is blocking the action.'
    )
  }

  return data as unknown as Post
}

export async function updatePostCaption(params: {
  postId: string
  userId: string
  caption: string
}): Promise<Post> {
  const nextCaption = params.caption.trim() || null

  const { data: updatedPost, error } = await supabase
    .from('posts')
    .update({
      caption: nextCaption,
    })
    .eq('id', params.postId)
    .eq('user_id', params.userId)
    .select(POST_SELECT)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!updatedPost) {
    throw new Error(
      'Post could not be updated. This usually means your database update policy is blocking the action.'
    )
  }

  return updatedPost as unknown as Post
}

function getStoragePathFromPublicUrl(
  publicUrl: string,
  bucketName: 'images' | 'videos'
): string | null {
  const marker = `/storage/v1/object/public/${bucketName}/`

  const markerIndex = publicUrl.indexOf(marker)
  if (markerIndex === -1) return null

  const path = publicUrl.slice(markerIndex + marker.length)
  return decodeURIComponent(path)
}

export async function deletePostRecord(params: {
  postId: string
  userId: string
  imageUrl?: string | null
  videoUrl?: string | null
}) {
  const { data: deletedPost, error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', params.postId)
    .eq('user_id', params.userId)
    .select('id')
    .maybeSingle()

  if (deleteError) {
    throw deleteError
  }

  if (!deletedPost) {
    throw new Error(
      'Post could not be deleted. This usually means your database delete policy is blocking the action.'
    )
  }

  if (params.imageUrl) {
    const storagePath = getStoragePathFromPublicUrl(params.imageUrl, 'images')

    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('images')
        .remove([storagePath])

      if (storageError) {
        console.error('Could not delete post image from storage:', storageError)
      }
    }
  }

  if (params.videoUrl) {
    const storagePath = getStoragePathFromPublicUrl(params.videoUrl, 'videos')

    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from('videos')
        .remove([storagePath])

      if (storageError) {
        console.error('Could not delete post video from storage:', storageError)
      }
    }
  }
}