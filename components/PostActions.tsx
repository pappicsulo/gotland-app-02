// ===== PostActions.tsx =====

'use client'

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
              className="flex h-14 w-14 items-center justify-center rounded-full bg-black/30 text-3xl text-white backdrop-blur-md transition hover:scale-110 active:scale-95"
              aria-label="Like post"
            >
              <span
                className={`transition-transform duration-200 ${
                  isLiked
                    ? 'scale-125 text-red-500'
                    : 'scale-100 opacity-85'
                }`}
              >
                {isLiked ? '♥' : '♡'}
              </span>
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
              className="flex h-14 w-14 items-center justify-center rounded-full bg-black/25 text-2xl text-white backdrop-blur-md transition hover:scale-105"
              aria-label="Comments"
            >
              💬
            </button>
          </div>

          {/* SHARE */}
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
  )
}