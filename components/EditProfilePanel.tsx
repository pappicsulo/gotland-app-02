'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import type { ProfileData } from '@/hooks/useProfile'

type Props = {
  open: boolean
  profile: ProfileData
  onClose: () => void
  onSave: (data: {
    username: string
    fullName: string
    bio: string
    avatarFile: File | null
  }) => Promise<void>
}

export default function EditProfilePanel({
  open,
  profile,
  onClose,
  onSave,
}: Props) {
  const [username, setUsername] = useState(profile.username || '')
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setUsername(profile.username || '')
    setFullName(profile.full_name || '')
    setBio(profile.bio || '')
    setAvatarFile(null)
    setError('')
  }, [open, profile])

  const previewUrl = useMemo(() => {
    if (avatarFile) {
      return URL.createObjectURL(avatarFile)
    }
    return profile.avatar_url || null
  }, [avatarFile, profile.avatar_url])

  useEffect(() => {
    return () => {
      if (previewUrl && avatarFile) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl, avatarFile])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const normalizedUsername = username.trim().toLowerCase()

    if (!normalizedUsername) {
      setError('Username is required.')
      return
    }

    if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
      setError('Username can only contain lowercase letters, numbers, and underscores.')
      return
    }

    if (normalizedUsername.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }

    setLoading(true)

    try {
      await onSave({
        username: normalizedUsername,
        fullName,
        bio,
        avatarFile,
      })
    } catch (err: any) {
      console.error(err)

      if (
        err?.message?.toLowerCase().includes('duplicate') ||
        err?.message?.toLowerCase().includes('unique')
      ) {
        setError('Username is already taken.')
      } else {
        setError(err?.message || JSON.stringify(err) || 'Could not update profile.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 text-white shadow-2xl"
      >
        <h2 className="mb-4 text-xl font-semibold">Edit Profile</h2>

        <div className="mb-4 flex items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-zinc-800">
            {previewUrl ? (
              avatarFile ? (
                <img
                  src={previewUrl}
                  alt="Avatar preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={previewUrl}
                  alt="Avatar preview"
                  width={64}
                  height={64}
                  sizes="64px"
                  className="h-full w-full object-cover"
                />
              )
            ) : (
              <span className="text-lg font-semibold">
                {(username || profile.username || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <label
            className={`cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium text-black ${
              loading ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            Change photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={loading}
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setAvatarFile(file)
              }}
            />
          </label>
        </div>

        <label className="mb-2 block text-sm text-zinc-300">Username</label>
        <input
          value={username}
          disabled={loading}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          className="mb-4 w-full rounded-xl bg-zinc-800 p-3 outline-none disabled:opacity-50"
        />

        <label className="mb-2 block text-sm text-zinc-300">Full name</label>
        <input
          value={fullName}
          disabled={loading}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className="mb-4 w-full rounded-xl bg-zinc-800 p-3 outline-none disabled:opacity-50"
        />

        <label className="mb-2 block text-sm text-zinc-300">Bio</label>
        <textarea
          value={bio}
          disabled={loading}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Write something about yourself"
          maxLength={160}
          rows={4}
          className="mb-2 w-full rounded-xl bg-zinc-800 p-3 outline-none disabled:opacity-50"
        />

        <p className="mb-4 text-right text-xs text-zinc-500">{bio.length}/160</p>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full px-4 py-2 text-zinc-400 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-white px-5 py-2 font-medium text-black disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}