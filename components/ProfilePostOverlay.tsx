// ===== ProfilePostOverlay.tsx =====

'use client'

// =========================
// IMPORTS
// =========================

import type { User } from '@supabase/supabase-js'

import type { Post } from '@/types'
import PostCard from '@/components/PostCard'

// =========================
// TYPES
// =========================

type ProfilePostOverlayProps = {
  posts: Post[]
  user: User | null
  currentUserId: string | null
  activePostId: string | null
  overlayScrollRef: React.RefObject<HTMLDivElement | null>
  postRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
  onClose: () => void
  onDeletePost: (
    postId: string,
    imageUrl?: string | null,
    videoUrl?: string | null,
    videoThumbnailUrl?: string | null
  ) => void
}

// =========================
// COMPONENT
// =========================

export default function ProfilePostOverlay({
  posts,
  user,
  currentUserId,
  activePostId,
  overlayScrollRef,
  postRefs,
  onClose,
  onDeletePost,
}: ProfilePostOverlayProps) {
  return (
    <div className="absolute inset-0 z-40 bg-black/90 p-3">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur"
        >
          Close
        </button>
      </div>

      <div
        ref={overlayScrollRef}
        className="no-scrollbar h-[calc(100%-56px)] snap-y snap-mandatory overflow-y-auto"
      >
        {posts.map((post) => (
          <div
            key={post.id}
            ref={(el) => {
              postRefs.current[post.id] = el
            }}
            className="snap-start py-2"
          >
            <PostCard
              post={post}
              user={user}
              currentUserId={currentUserId}
              onDelete={onDeletePost}
              isActive={activePostId === post.id}
            />
          </div>
        ))}
      </div>
    </div>
  )
}