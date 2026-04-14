'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase/client'
import type { Comment } from '@/types'

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
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function loadComments() {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        created_at,
        post_id,
        user_id,
        content,
        profiles:profiles!comments_user_id_fkey (
          username,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      setMessage('Kunde inte hämta kommentarer.')
      return
    }

    setComments((data ?? []) as unknown as Comment[])
  }

  useEffect(() => {
    if (open) {
      loadComments()
    }
  }, [open, postId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMessage('')

    if (!user) {
      setMessage('Du måste logga in för att kommentera.')
      return
    }

    if (!content.trim()) {
      setMessage('Skriv en kommentar först.')
      return
    }

    setLoading(true)

    const { error } = await supabase.from('comments').insert([
      {
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
      },
    ])

    setLoading(false)

    if (error) {
      console.error(error)
      setMessage('Kunde inte spara kommentaren.')
      return
    }

    setContent('')
    await loadComments()
  }

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
          {comments.length === 0 ? (
            <p className="text-sm text-zinc-400">No comments yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {comments.map((comment) => {
                const username = comment.profiles?.username ?? 'unknown'
                const avatarUrl = comment.profiles?.avatar_url ?? null
                const avatarLetter = username.charAt(0).toUpperCase()

                return (
                  <div key={comment.id} className="rounded-2xl bg-white/5 p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10 text-sm font-semibold text-white">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={`${username} avatar`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{avatarLetter}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">
                          @{username}
                        </p>
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

        <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">
          <div className="flex items-center gap-2">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-50"
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>

          {message && <p className="mt-2 text-sm text-red-400">{message}</p>}
        </form>
      </div>
    </div>
  )
}