'use client'

import type { User } from '@supabase/supabase-js'

type CreatePostPanelProps = {
  show: boolean
  loading: boolean
  message: string
  caption: string
  user: User | null
  onCaptionChange: (value: string) => void
  onFileChange: (file: File | null) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

export default function CreatePostPanel({
  show,
  loading,
  message,
  caption,
  user,
  onCaptionChange,
  onFileChange,
  onSubmit,
}: CreatePostPanelProps) {
  if (!show) return null

  return (
    <div className="absolute inset-x-4 top-24 z-40 rounded-3xl border border-white/10 bg-black/90 p-4 backdrop-blur-xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Create post</h2>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
        />

        <textarea
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          className="min-h-[110px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
        />

        <button
          type="submit"
          disabled={loading || !user}
          className="rounded-full bg-white px-5 py-3 font-medium text-black disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Post'}
        </button>

        {message && <p className="text-sm text-zinc-300">{message}</p>}
      </form>
    </div>
  )
}