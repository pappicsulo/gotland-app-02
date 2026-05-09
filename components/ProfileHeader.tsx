// ===== ProfileHeader.tsx =====

'use client'

// =========================
// IMPORTS
// =========================

import Image from 'next/image'
import type { User } from '@supabase/supabase-js'

import type { ProfileData } from '@/hooks/useProfile'
import ReportProfileButton from '@/components/ReportProfileButton'

// =========================
// TYPES
// =========================

type ProfileHeaderProps = {
  profile: ProfileData
  user: User | null
  currentUserId: string | null
  isOwnProfile: boolean
  isFollowing: boolean
  followLoading: boolean
  saveLoading: boolean
  followerCount: number
  followingCount: number
  message: string
  onBack: () => void
  onEditProfile: () => void
  onToggleFollow: () => void
}

// =========================
// COMPONENT
// =========================

export default function ProfileHeader({
  profile,
  user,
  currentUserId,
  isOwnProfile,
  isFollowing,
  followLoading,
  saveLoading,
  followerCount,
  followingCount,
  message,
  onBack,
  onEditProfile,
  onToggleFollow,
}: ProfileHeaderProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/85 via-black/40 to-transparent px-4 pb-8 pt-5">
      <div className="pointer-events-auto flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm backdrop-blur"
        >
          Back
        </button>

        <div className="flex-1 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">
            Profile
          </p>

          <h1 className="mt-1 text-2xl font-bold">@{profile.username}</h1>

          <div className="mt-3 flex items-center justify-center gap-3">
            <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 text-lg font-semibold backdrop-blur">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={`${profile.username} avatar`}
                  width={56}
                  height={56}
                  sizes="56px"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>
                  {profile.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>

            <div className="text-left">
              <p className="text-sm font-medium text-white/95">
                {profile.full_name || 'No name'}
              </p>

              <p className="text-sm text-zinc-300">
                {followerCount} followers · {followingCount} following
              </p>
            </div>
          </div>

          {profile.bio && (
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-zinc-300">
              {profile.bio}
            </p>
          )}

          {isOwnProfile && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onEditProfile}
                disabled={saveLoading}
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {saveLoading ? 'Saving...' : 'Edit Profile'}
              </button>
            </div>
          )}

          {!isOwnProfile && currentUserId && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onToggleFollow}
                disabled={followLoading}
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {followLoading
                  ? 'Loading...'
                  : isFollowing
                  ? 'Following'
                  : 'Follow'}
              </button>

              <ReportProfileButton
                user={user}
                reportedUserId={profile.id}
              />
            </div>
          )}

          {!currentUserId && (
            <p className="mt-4 text-sm text-zinc-400">
              Sign in to follow users.
            </p>
          )}

          {message && <p className="mt-3 text-sm text-red-400">{message}</p>}
        </div>

        <div className="w-[72px]" />
      </div>
    </div>
  )
}