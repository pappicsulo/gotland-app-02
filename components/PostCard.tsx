'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import type { Post } from '@/types'
import CommentsSheet from '@/components/CommentsSheet'
import { playAudioSegment, stopAudio } from '@/lib/audio'

type PostCardProps = {
  post: Post
  user?: User | null
  currentUserId?: string | null
  isLiked?: boolean
  likeCount?: number
  onLike?: (postId: string) => void
  onDelete?: (
    postId: string,
    imageUrl?: string | null,
    videoUrl?: string | null
  ) => void
  onEdit?: (postId: string, caption: string) => void
  isActive?: boolean
  hideDelete?: boolean
}

export default function PostCard({
  post,
  user = null,
  currentUserId = null,
  isLiked = false,
  likeCount = 0,
  onLike = () => {},
  onDelete,
  onEdit,
  isActive = false,
  hideDelete = false,
}: PostCardProps) {
  const router = useRouter()
  const [commentsOpen, setCommentsOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const username = post.profiles?.username ?? 'unknown'
  const avatarLetter = username.charAt(0).toUpperCase()
  const avatarUrl = post.profiles?.avatar_url ?? null

  const audioUrl = post.audio_url ?? null
  const audioStart = typeof post.audio_start === 'number' ? post.audio_start : 0
  const audioDuration =
    typeof post.audio_duration === 'number' ? post.audio_duration : 10

  const signedInUserId = currentUserId ?? user?.id ?? null
  const isOwnPost = !!signedInUserId && signedInUserId === post.user_id

  const isReady = post.upload_status === 'ready'
  const isProcessing = post.upload_status === 'processing'
  const isFailed = post.upload_status === 'failed'

  const hasVideo = post.media_type === 'video' && !!post.video_url
  const hasImage = post.media_type === 'image' && !!post.image_url

  function handleOpenProfile() {
    if (!post.user_id) return
    router.push(`/profile/${post.user_id}`)
  }

  function handleDeleteClick() {
    if (!isOwnPost || !onDelete) return

    const confirmed = window.confirm(
      'Do you want to delete this post? This cannot be undone.'
    )

    if (!confirmed) return

    onDelete(post.id, post.image_url, post.video_url)
  }

  function handleEditClick() {
    if (!isOwnPost || !onEdit) return

    const nextCaption = window.prompt('Edit caption:', post.caption ?? '')

    if (nextCaption === null) return

    onEdit(post.id, nextCaption)
  }

  useEffect(() => {
    if (!isReady) {
      stopAudio()
      return
    }

    if (hasVideo) {
      stopAudio()
      return
    }

    if (!isActive || !audioUrl) return

    void playAudioSegment(audioUrl, audioStart, audioDuration)

    return () => {
      stopAudio()
    }
  }, [isActive, isReady, hasVideo, audioUrl, audioStart, audioDuration])

  useEffect(() => {
    if (!isReady || !hasVideo || !videoRef.current) return

    const video = videoRef.current

    if (!isActive) {
      video.pause()
      video.currentTime = 0
      return
    }

    const playPromise = video.play()

    if (playPromise) {
      playPromise.catch((error) => {
        if (error?.name !== 'AbortError') {
          console.error('Video play failed:', error)
        }
      })
    }

    return () => {
      video.pause()
      video.currentTime = 0
    }
  }, [isActive, isReady, hasVideo])

  return (
    <section className="relative h-[88svh] overflow-hidden rounded-[28px] bg-black">
      {hasVideo ? (
        <video
          ref={videoRef}
          src={post.video_url ?? undefined}
          className="h-full w-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : hasImage ? (
        <Image
          src={post.image_url!}
          alt={post.caption || 'Post image'}
          fill
          sizes="(max-width: 430px) 100vw, 430px"
          className="object-cover"
          priority={isActive}
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-900" />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/85" />

      {isProcessing && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/45 px-6 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <p className="mt-4 text-base font-semibold text-white">
            Processing video...
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            You can keep using the app while this finishes.
          </p>
        </div>
      )}

      {isFailed && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/55 px-6 text-center">
          <div className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-200">
            Failed
          </div>
          <p className="mt-4 text-base font-semibold text-white">
            Video could not be processed
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            {post.processing_error || 'Something went wrong.'}
          </p>
        </div>
      )}

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

            {isOwnPost && isReady && (onEdit || (onDelete && !hideDelete)) && (
              <div className="mt-3 flex items-center gap-4 text-sm">
                {onEdit && (
                  <button
                    type="button"
                    onClick={handleEditClick}
                    className="text-white/70 transition hover:text-white"
                  >
                    Edit
                  </button>
                )}

                {onDelete && !hideDelete && (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="text-red-300 transition hover:text-red-200"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}

            {isOwnPost && !isReady && onDelete && !hideDelete && (
              <div className="mt-3 flex items-center gap-4 text-sm">
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="text-red-300 transition hover:text-red-200"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-4 pb-2">
            <button
              type="button"
              onClick={handleOpenProfile}
              className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-black/25 text-lg font-semibold text-white backdrop-blur-md transition hover:scale-105"
              aria-label="Open profile"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={`${username} avatar`}
                  width={56}
                  height={56}
                  sizes="56px"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{avatarLetter}</span>
              )}
            </button>

            {isReady ? (
              <>
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
              </>
            ) : (
              <div className="rounded-full bg-black/30 px-3 py-2 text-xs text-white/80 backdrop-blur-md">
                {isProcessing ? 'Working...' : 'Unavailable'}
              </div>
            )}
          </div>
        </div>
      </div>

      {isReady && (
        <CommentsSheet
          postId={post.id}
          user={user}
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
        />
      )}
    </section>
  )
}