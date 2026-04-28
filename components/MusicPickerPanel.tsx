'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { MUSIC_TRACKS, type MusicTrack } from '@/lib/musicTracks'

type MusicPickerPanelProps = {
  open: boolean
  selectedTrack: MusicTrack | null
  loading: boolean
  onClose: () => void
  onSelectTrack: (track: MusicTrack | null) => void
}

function formatTrackTitle(title: string) {
  return title
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\d{4,}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function MusicPickerPanel({
  open,
  selectedTrack,
  loading,
  onClose,
  onSelectTrack,
}: MusicPickerPanelProps) {
  const [query, setQuery] = useState('')
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previewTimeoutRef = useRef<number | null>(null)

  const filteredTracks = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase()

    if (!trimmedQuery) {
      return MUSIC_TRACKS
    }

    return MUSIC_TRACKS.filter((track) => {
      const title = track.title.toLowerCase()
      const artist = track.artist.toLowerCase()

      return title.includes(trimmedQuery) || artist.includes(trimmedQuery)
    })
  }, [query])

  function stopPreview() {
    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current)
      previewTimeoutRef.current = null
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }

    setPlayingTrackId(null)
  }

  useEffect(() => {
    if (!open) {
      setQuery('')
      stopPreview()
    }
  }, [open])

  useEffect(() => {
    return () => {
      stopPreview()
    }
  }, [])

  function handlePreviewTrack(track: MusicTrack) {
    if (playingTrackId === track.id) {
      stopPreview()
      return
    }

    stopPreview()

    const audio = new Audio(track.url)
    audio.currentTime = track.start

    audio.play().catch((error) => {
      console.error('Music preview failed:', error)
      setPlayingTrackId(null)
    })

    audioRef.current = audio
    setPlayingTrackId(track.id)

    previewTimeoutRef.current = window.setTimeout(() => {
      stopPreview()
    }, track.duration * 1000)
  }

  function handleSelectTrack(track: MusicTrack) {
    stopPreview()

    if (selectedTrack?.id === track.id) {
      onSelectTrack(null)
      return
    }

    onSelectTrack(track)
    onClose()
  }

  if (!open) return null

  return (
    <div className="absolute inset-0 z-50 bg-black/80 px-4 pb-4 pt-24 backdrop-blur-xl">
      <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-zinc-950 p-4 text-white">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
              Music
            </p>
            <h2 className="text-xl font-semibold">Choose music</h2>
          </div>

          <button
            type="button"
            onClick={() => {
              stopPreview()
              onClose()
            }}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm backdrop-blur"
          >
            Close
          </button>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search music..."
          autoFocus
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
        />

        {selectedTrack && (
          <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
            <p className="text-xs text-emerald-300">Selected</p>
            <p className="mt-1 truncate text-sm font-semibold text-white">
              {formatTrackTitle(selectedTrack.title)}
            </p>
            <p className="truncate text-xs text-zinc-400">
              {selectedTrack.artist}
            </p>
          </div>
        )}

        <div className="no-scrollbar mt-4 flex-1 overflow-y-auto">
          {filteredTracks.length === 0 ? (
            <p className="px-1 text-sm text-zinc-400">No music found.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredTracks.map((track) => {
                const isPlaying = playingTrackId === track.id
                const isSelected = selectedTrack?.id === track.id

                return (
                  <div
                    key={track.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      isSelected
                        ? 'border-emerald-400/40 bg-emerald-400/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {formatTrackTitle(track.title)}
                        </p>
                        <p className="truncate text-xs text-zinc-400">
                          {track.artist}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handlePreviewTrack(track)}
                          className={`text-xs transition disabled:opacity-50 ${
                            isPlaying
                              ? 'text-red-300 hover:text-red-200'
                              : 'text-white/80 hover:text-white'
                          }`}
                        >
                          {isPlaying ? 'Stop' : 'Preview'}
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleSelectTrack(track)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
                            isSelected
                              ? 'bg-emerald-400 text-black'
                              : 'bg-white text-black hover:opacity-90'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Use'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {selectedTrack && (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              stopPreview()
              onSelectTrack(null)
            }}
            className="mt-4 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm text-white disabled:opacity-50"
          >
            Remove selected music
          </button>
        )}
      </div>
    </div>
  )
}