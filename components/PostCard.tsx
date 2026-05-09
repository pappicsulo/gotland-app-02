// ===== PostCard.tsx =====

'use client'

// =========================
// IMPORTS
// =========================

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import type { Post } from '@/types'
import CommentsSheet from '@/components/CommentsSheet'
import ReportPostButton from '@/components/ReportPostButton'
import PostMedia from '@/components/PostMedia'
import PostActions from '@/components/PostActions'
import { playAudioSegment, stopAudio } from '@/lib/audio'

// =========================
// TYPES
// =========================

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
    videoUrl?: string | null,
    videoThumbnailUrl?: string | null
  ) => void
  onEdit?: (postId: string, caption: string) => void
  isActive?: boolean
  shouldPreload?: boolean
  hideDelete?: boolean
}

// =========================
// COMPONENT
// =========================

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
  shouldPreload = false,
  hideDelete = false,
}: PostCardProps) {
  const router = useRouter()

  // =========================
  // STATE
  // =========================

  const [commentsOpen, setCommentsOpen] = useState(false)

  // =========================
  // REFS
  // =========================

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playbackRunRef = useRef(0)

  // =========================
  // DERIVED VALUES
  // =========================

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

  // =========================
  // HANDLERS
  // =========================

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

    onDelete(
      post.id,
      post.image_url,
      post.video_url,
      post.video_thumbnail_url
    )
  }

  function handleEditClick() {
    if (!isOwnPost || !onEdit) return

    const nextCaption = window.prompt('Edit caption:', post.caption ?? '')

    if (nextCaption === null) return

    onEdit(post.id, nextCaption)
  }

  // =========================
  // EFFECT: VIDEO / AUDIO PLAYBACK
  // =========================

  useEffect(() => {
    const runId = playbackRunRef.current + 1
    playbackRunRef.current = runId

    const video = videoRef.current

    function pauseAndResetVideo() {
      if (!video) return

      video.pause()

      try {
        video.currentTime = 0
      } catch {
        // Ignore rare browser seek/reset errors.
      }
    }

    async function startPlayback() {
      if (!isReady) {
        pauseAndResetVideo()

        if (isActive) {
          stopAudio()
        }

        return
      }

      if (!isActive) {
        pauseAndResetVideo()
        return
      }

      if (hasVideo) {
        if (!video) {
          stopAudio()
          return
        }

        try {
          await video.play()
        } catch (error: any) {
          if (error?.name !== 'AbortError') {
            console.error('Video play failed:', error)
          }

          stopAudio()
          return
        }

        if (playbackRunRef.current !== runId) return

        if (audioUrl) {
          await playAudioSegment(audioUrl, audioStart, audioDuration, post.id)
        } else {
          stopAudio()
        }

        return
      }

      if (audioUrl) {
        await playAudioSegment(audioUrl, audioStart, audioDuration, post.id)
      } else {
        stopAudio()
      }
    }

    void startPlayback()

    return () => {
      if (playbackRunRef.current === runId) {
        pauseAndResetVideo()
        stopAudio()
      }
    }
  }, [
    isActive,
    isReady,
    hasVideo,
    audioUrl,
    audioStart,
    audioDuration,
    post.id,
  ])

  // =========================
  // RENDER
  // =========================

  return (
    <section className="relative h-[88svh] overflow-hidden rounded-[28px] bg-black">
      {/* MEDIA */}
      <PostMedia
        mediaType={post.media_type}
        imageUrl={post.image_url}
        videoUrl={post.video_url}
        caption={post.caption}
        isActive={isActive}
        shouldPreload={shouldPreload}
        videoRef={videoRef}
      />

      {/* OVERLAY GRADIENT */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/85" />

      {/* PROCESSING STATE */}
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

      {/* FAILED STATE */}
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

      {/* CONTENT */}
      <div className="absolute inset-x-0 bottom-0 z-20 p-5">
        <div className="flex items-end justify-between gap-4">
          {/* LEFT SIDE: TEXT + OWNER ACTIONS */}
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

            {audioUrl && (
              <p className="mt-2 truncate text-xs text-white/75">
                ♪ Music added
              </p>
            )}

            {isReady && (
              <div className="mt-3 flex items-center gap-4 text-sm">
                {!isOwnPost && (
                  <ReportPostButton
                    user={user}
                    postId={post.id}
                    reportedUserId={post.user_id}
                  />
                )}

                {isOwnPost && onEdit && (
                  <button
                    type="button"
                    onClick={handleEditClick}
                    className="text-white/70 transition hover:text-white"
                  >
                    Edit
                  </button>
                )}

                {isOwnPost && onDelete && !hideDelete && (
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

          {/* RIGHT SIDE: AVATAR + ACTION BUTTONS */}
          <PostActions
            avatarUrl={avatarUrl}
            avatarLetter={avatarLetter}
            username={username}
            isReady={isReady}
            isProcessing={isProcessing}
            isLiked={isLiked}
            likeCount={likeCount}
            onOpenProfile={handleOpenProfile}
            onLike={() => onLike(post.id)}
            onOpenComments={() => setCommentsOpen(true)}
          />
        </div>
      </div>

      {/* COMMENTS */}
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