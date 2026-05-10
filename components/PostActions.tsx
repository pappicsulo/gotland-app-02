// ===== PostActions.tsx =====

'use client'

// =========================
// IMPORTS
// =========================

import {
  ArrowUpRight,
  Heart,
  MessageCircle,
} from 'lucide-react'

// =========================
// TYPES
// =========================

type PostActionsProps = {
  avatarUrl: string | null
  avatarLetter: string
  username: string

  isReady: boolean
  isProcessing: boolean

  isLiked: boolean
  likeCount: number

  onOpenProfile: () => void
  onLike: () => void
  onOpenComments: () => void
}

// =========================
// COMPONENT
// =========================

export default function PostActions({
  avatarUrl,
  avatarLetter,
  username,

  isReady,
  isProcessing,

  isLiked,
  likeCount,

  onOpenProfile,
  onLike,
  onOpenComments,
}: PostActionsProps) {
  const actionButtonClass =
    'flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-black/25 text-white backdrop-blur-md transition hover:scale-105 hover:bg-white/10 active:scale-95'

  return (
    <div className="flex flex-col items-center gap-4 pb-2">
      {/* AVATAR */}
      <button
        type="button"
        onClick={onOpenProfile}
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

      {/* READY ACTIONS */}
      {isReady ? (
        <>
          {/* LIKE */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onLike}
              className={actionButtonClass}
              aria-label="Like post"
            >
              <Heart
                size={34}
                strokeWidth={2.2}
                className={`transition duration-200 ${
                  isLiked
                    ? 'fill-red-500 text-red-500'
                    : 'text-white'
                }`}
              />
            </button>

            <span className="text-sm font-medium text-white drop-shadow-sm">
              {likeCount}
            </span>
          </div>

          {/* COMMENTS */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onOpenComments}
              className={actionButtonClass}
              aria-label="Comments"
            >
              <MessageCircle
                size={32}
                strokeWidth={2.2}
                className="text-white"
              />
            </button>
          </div>

          {/* SHARE */}
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              className={actionButtonClass}
              aria-label="Share"
            >
              <ArrowUpRight
                size={32}
                strokeWidth={2.2}
                className="text-white"
              />
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-full bg-black/30 px-3 py-2 text-xs text-white/80 backdrop-blur-md">
          {isProcessing ? 'Working...' : 'Unavailable'}
        </div>
      )}
    </div>
  )
}