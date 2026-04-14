export type ProfilePreview = {
  username: string | null
  avatar_url?: string | null
  full_name?: string | null
  bio?: string | null
}

export type Post = {
  id: string
  image_url: string
  caption: string | null
  created_at: string
  user_id: string | null
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