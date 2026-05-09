// ===== ProfilePostGrid.tsx =====

'use client'

// =========================
// IMPORTS
// =========================

import Image from 'next/image'

import type { Post } from '@/types'

// =========================
// TYPES
// =========================

type ProfilePostGridProps = {
  posts: Post[]
  username: string
  onOpenPost: (postId: string) => void
}

// =========================
// COMPONENT
// =========================

export default function ProfilePostGrid({
  posts,
  username,
  onOpenPost,
}: ProfilePostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div>
          <p className="text-xl font-semibold">No posts yet</p>

          <p className="mt-2 text-zinc-400">
            @{username} has not posted anything yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {posts.map((post) => {
        const isVideoPost = post.media_type === 'video' && !!post.video_url
        const isProcessing = post.upload_status === 'processing'
        const isFailed = post.upload_status === 'failed'
        const canOpenPost = post.upload_status === 'ready'

        return (
          <button
            key={post.id}
            type="button"
            onClick={() => {
              if (!canOpenPost) return
              onOpenPost(post.id)
            }}
            className={`group relative aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900 text-left ${
              canOpenPost ? '' : 'cursor-default'
            }`}
          >
            {isVideoPost ? (
              post.video_thumbnail_url ? (
                <Image
                  src={post.video_thumbnail_url}
                  alt={post.caption || 'Video thumbnail'}
                  fill
                  sizes="(max-width: 430px) 50vw, 215px"
                  className={`object-cover transition duration-300 ${
                    canOpenPost ? 'group-hover:scale-105' : ''
                  } ${isProcessing || isFailed ? 'opacity-40' : ''}`}
                />
              ) : (
                <div
                  className={`flex h-full w-full items-center justify-center bg-zinc-800 text-xs text-zinc-400 ${
                    isProcessing || isFailed ? 'opacity-40' : ''
                  }`}
                >
                  Video
                </div>
              )
            ) : post.image_url ? (
              <Image
                src={post.image_url}
                alt={post.caption || 'Post image'}
                fill
                sizes="(max-width: 430px) 50vw, 215px"
                className={`object-cover transition duration-300 ${
                  canOpenPost ? 'group-hover:scale-105' : ''
                } ${isProcessing || isFailed ? 'opacity-40' : ''}`}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-xs text-zinc-400">
                No media
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            {isVideoPost && !isProcessing && !isFailed && (
              <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                Video
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 px-4 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                <p className="mt-3 text-sm font-semibold text-white">
                  Processing...
                </p>

                <p className="mt-1 text-xs text-zinc-300">
                  Your video is being prepared
                </p>
              </div>
            )}

            {isFailed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 px-4 text-center">
                <div className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-200">
                  Failed
                </div>

                <p className="mt-3 text-sm font-semibold text-white">
                  Video failed
                </p>

                <p className="mt-1 text-xs text-zinc-300">
                  {post.processing_error || 'Something went wrong'}
                </p>
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="truncate text-sm font-semibold text-white">
                @{post.profiles?.username ?? 'unknown'}
              </p>

              <p className="mt-1 line-clamp-2 text-xs text-white/85">
                {post.caption || 'No caption'}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}