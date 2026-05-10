// ===== UserSearchPanel.tsx =====

'use client'

// =========================
// IMPORTS
// =========================

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import {
  searchUsers,
  type UserSearchResult,
} from '@/lib/searchUsers'

// =========================
// TYPES
// =========================

type UserSearchPanelProps = {
  open: boolean
  onClose: () => void
}

// =========================
// COMPONENT
// =========================

export default function UserSearchPanel({
  open,
  onClose,
}: UserSearchPanelProps) {
  const router = useRouter()

  // =========================
  // STATE
  // =========================

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // =========================
  // EFFECTS
  // =========================

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setLoading(false)
      setMessage('')
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const trimmedQuery = query.trim()

    if (trimmedQuery.length < 2) {
      setResults([])
      setMessage('')
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      setMessage('')

      try {
        const users = await searchUsers(trimmedQuery)
        setResults(users)

        if (users.length === 0) {
          setMessage('No users found.')
        }
      } catch (error) {
        console.error(error)
        setMessage('Could not search users.')
      } finally {
        setLoading(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [query, open])

  // =========================
  // HANDLERS
  // =========================

  function openProfile(userId: string) {
    onClose()
    router.push(`/profile/${userId}`)
  }

  // =========================
  // RENDER
  // =========================

  if (!open) return null

  return (
    <div className="absolute inset-x-0 bottom-0 top-0 z-50 w-full overflow-hidden bg-black/80 px-4 pb-4 pt-24 text-white backdrop-blur-xl touch-pan-y">
      <div className="mx-auto flex h-full w-full max-w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-4">
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
              Search
            </p>

            <h2 className="text-xl font-semibold">Find users</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm backdrop-blur"
          >
            Close
          </button>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search username..."
        
          className="w-full shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500"
        />

        <div className="no-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden touch-pan-y">
          {query.trim().length < 2 ? (
            <p className="px-1 text-sm text-zinc-500">
              Type at least 2 characters.
            </p>
          ) : loading ? (
            <p className="px-1 text-sm text-zinc-400">Searching...</p>
          ) : results.length > 0 ? (
            <div className="flex w-full flex-col gap-3 overflow-x-hidden">
              {results.map((profile) => {
                const username = profile.username || 'unknown'
                const avatarLetter = username.charAt(0).toUpperCase()

                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => openProfile(profile.id)}
                    className="flex w-full min-w-0 items-center gap-3 rounded-2xl bg-white/5 p-3 text-left transition hover:bg-white/10"
                  >
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10 text-sm font-semibold text-white">
                      {profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={`${username} avatar`}
                          width={48}
                          height={48}
                          sizes="48px"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>{avatarLetter}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        @{username}
                      </p>

                      <p className="truncate text-xs text-zinc-400">
                        {profile.full_name || 'No name'}
                      </p>

                      {profile.bio && (
                        <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                          {profile.bio}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : message ? (
            <p className="px-1 text-sm text-zinc-400">{message}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}