'use client'

import Image from 'next/image'
import { useEffect } from 'react'
import type { User } from '@supabase/supabase-js'

import { useComments } from '@/hooks/useComments'

type CommentsSheetProps = {
  postId: string
  user: User | null
  open: boolean
  onClose: () => void
}

export default function CommentsSheet({
  postId,
  user,
  open,
  onClose,
}: CommentsSheetProps) {
  const {
    comments,
    content,
    loading,
    submitting,
    deletingCommentId,
    message,
    setContent,
    loadComments,
    resetCommentsState,
    handleSubmitComment,
    handleDeleteComment,
  } = useComments(postId)

  useEffect(() => {
    if (open) {
      void loadComments()
      return
    }

    resetCommentsState()
  }, [open, postId, loadComments, resetCommentsState])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/50">
      <div className="flex h-[62%] w-full flex-col rounded-t-[28px] bg-zinc-950 text-white">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <h3 className="text-lg font-semibold">Comments</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="text-sm text-zinc-400">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-zinc-400">No comments yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {comments.map((comment) => {
                const username = comment.profiles?.username ?? 'unknown'
                const avatarUrl = comment.profiles?.avatar_url ?? null
                const avatarLetter = username.charAt(0).toUpperCase()
                const isOwnComment = !!user && user.id === comment.user_id
                const isDeleting = deletingCommentId === comment.id

                return (
                  <div key={comment.id} className="rounded-2xl bg-white/5 p-3">
                    <div className="flex items-start gap-3">
                      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10 text-sm font-semibold text-white">
                        {avatarUrl ? (
                          <Image
                            src={avatarUrl}
                            alt={`${username} avatar`}
                            width={40}
                            height={40}
                            sizes="40px"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{avatarLetter}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-white">
                            @{username}
                          </p>

                          {isOwnComment && (
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={async () => {
                                const confirmed = window.confirm(
                                  'Do you want to delete this comment?'
                                )

                                if (!confirmed) return

                                await handleDeleteComment(user, comment.id)
                              }}
                              className="text-xs font-medium text-red-300 transition hover:text-red-200 disabled:opacity-50"
                            >
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-zinc-200">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await handleSubmitComment(user)
          }}
          className="border-t border-white/10 p-4"
        >
          <div className="flex items-center gap-2">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            />

            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-50"
            >
              {submitting ? '...' : 'Send'}
            </button>
          </div>

          {message && <p className="mt-2 text-sm text-red-400">{message}</p>}
        </form>
      </div>
    </div>
  )
}