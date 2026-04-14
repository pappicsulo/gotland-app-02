'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import type { Post } from '@/types'
import CommentsSheet from '@/components/CommentsSheet'

type PostCardProps = {
  post: Post
  user?: User | null
  isLiked?: boolean
  likeCount?: number
  onLike?: (postId: string) => void
}

export default function PostCard({
  post,
  user = null,
  isLiked = false,
  likeCount = 0,
  onLike = () => {},
}: PostCardProps) {
  const router = useRouter()
  const [commentsOpen, setCommentsOpen] = useState(false)

  const username = post.profiles?.username ?? 'unknown'
  const avatarLetter = username.charAt(0).toUpperCase()
  const avatarUrl = post.profiles?.avatar_url ?? null

  function handleOpenProfile() {
    if (!post.user_id) return
    router.push(`/profile/${post.user_id}`)
  }

  return (
    <section className="relative h-[88svh] overflow-hidden rounded-[28px] bg-black">
      <img
        src={post.image_url}
        alt={post.caption || 'Post image'}
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/85" />

      <div className="absolute inset-x-0 bottom-0 z-20 p-5">
        <div className="flex items-end justify-between gap-4">
          <div className="max-w-[70%]">
            <button
              type="button"
              onClick={handleOpenProfile}
              className="text-left text-lg font-semibold text-white drop-shadow-md transition hover:opacity-90"
            >
              @{username}
            </button>

            <p className="mt-2 text-sm leading-6 text-white/90 drop-shadow-sm">
              {post.caption || 'No caption'}
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 pb-2">
            <button
              type="button"
              onClick={handleOpenProfile}
              className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-black/25 text-lg font-semibold text-white backdrop-blur-md transition hover:scale-105"
              aria-label="Open profile"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${username} avatar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{avatarLetter}</span>
              )}
            </button>

            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => onLike(post.id)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-black/30 text-3xl text-white backdrop-blur-md transition hover:scale-110 active:scale-95"
                aria-label="Like post"
              >
                <span
                  className={`transition-transform duration-200 ${
                    isLiked ? 'scale-125 text-red-500' : 'scale-100 opacity-85'
                  }`}
                >
                  {isLiked ? '♥' : '♡'}
                </span>
              </button>

              <span className="text-sm font-medium text-white drop-shadow-sm">
                {likeCount}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setCommentsOpen(true)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-black/25 text-2xl text-white backdrop-blur-md transition hover:scale-105"
                aria-label="Comments"
              >
                💬
              </button>
            </div>

            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-black/25 text-2xl text-white backdrop-blur-md transition hover:scale-105"
                aria-label="Share"
              >
                ↗
              </button>
            </div>
          </div>
        </div>
      </div>

      <CommentsSheet
        postId={post.id}
        user={user}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />
    </section>
  )
}