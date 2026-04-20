'use client'

import { useEffect, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'

type CreatePostPanelProps = {
  show: boolean
  loading: boolean
  message: string
  uploadStatus: string
  caption: string
  user: User | null
  mediaFile: File | null
  onCaptionChange: (value: string) => void
  onFileChange: (file: File | null) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

function getMediaKind(file: File | null): 'image' | 'video' | null {
  if (!file) return null
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

export default function CreatePostPanel({
  show,
  loading,
  message,
  uploadStatus,
  caption,
  user,
  mediaFile,
  onCaptionChange,
  onFileChange,
  onSubmit,
}: CreatePostPanelProps) {
  const mediaKind = getMediaKind(mediaFile)

  const previewUrl = useMemo(() => {
    if (!mediaFile) return null
    return URL.createObjectURL(mediaFile)
  }, [mediaFile])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  if (!show) return null

  return (
    <div className="absolute inset-x-4 top-24 z-40 rounded-3xl border border-white/10 bg-black/90 p-4 backdrop-blur-xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Create post</h2>

        <input
          type="file"
          accept="image/*,video/mp4,video/quicktime,video/webm"
          disabled={loading}
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none disabled:opacity-50"
        />

        <p className="text-sm text-zinc-400">
          Upload an image or a short video. Videos can be up to 30 seconds and 50 MB for now.
        </p>

        {previewUrl && mediaKind === 'image' && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <img
              src={previewUrl}
              alt="Image preview"
              className="h-56 w-full object-cover"
            />
          </div>
        )}

        {previewUrl && mediaKind === 'video' && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <video
              src={previewUrl}
              className="h-56 w-full object-cover"
              controls
              muted
              playsInline
              preload="metadata"
            />
          </div>
        )}

        <textarea
          placeholder="Write a caption..."
          value={caption}
          disabled={loading}
          onChange={(e) => onCaptionChange(e.target.value)}
          className="min-h-[110px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={loading || !user}
          className="rounded-full bg-white px-5 py-3 font-medium text-black disabled:opacity-50"
        >
          {loading ? 'Posting...' : 'Post'}
        </button>

        {uploadStatus && (
          <p className="text-sm text-zinc-300">{uploadStatus}</p>
        )}

        {message && (
          <p
            className={`text-sm ${
              message.toLowerCase().includes('created')
                ? 'text-emerald-400'
                : 'text-zinc-300'
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  )
}