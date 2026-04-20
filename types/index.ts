export type ProfilePreview = {
  username: string | null
  avatar_url?: string | null
  full_name?: string | null
  bio?: string | null
}

export type UploadStatus = 'processing' | 'ready' | 'failed'

export type Post = {
  id: string
  media_type: 'image' | 'video'
  image_url: string | null
  video_url: string | null
  video_duration: number | null
  caption: string | null
  created_at: string
  user_id: string | null
  audio_url: string | null
  audio_start: number
  audio_duration: number

  upload_status: UploadStatus
  processing_error: string | null
  source_video_url: string | null

  profiles?: ProfilePreview | null
}

export type Comment = {
  id: string
  created_at: string
  post_id: string
  user_id: string
  content: string
  profiles?: ProfilePreview | null
}

export type Follow = {
  follower_id: string
  following_id: string
  created_at: string
}