'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { useProfile } from '@/hooks/useProfile'
import { updateProfile, uploadAvatarImage } from '@/lib/profile'
import EditProfilePanel from '@/components/EditProfilePanel'
import PostCard from '@/components/PostCard'
import MobileShell from '@/components/MobileShell'

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()

  const profileId = params?.id as string
  const [editOpen, setEditOpen] = useState(false)
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null)
  const overlayScrollRef = useRef<HTMLDivElement | null>(null)

  const {
    profile,
    posts,
    loading,
    message,
    currentUserId,
    isOwnProfile,
    isFollowing,
    followLoading,
    followerCount,
    followingCount,
    refreshProfilePage,
    handleToggleFollow,
  } = useProfile(profileId)

  useEffect(() => {
    if (selectedPostIndex === null) return
    if (!overlayScrollRef.current) return

    const container = overlayScrollRef.current
    const child = container.children[selectedPostIndex] as HTMLElement | undefined

    if (child) {
      child.scrollIntoView({
        behavior: 'auto',
        block: 'start',
      })
    }
  }, [selectedPostIndex])

  if (loading) {
    return (
      <MobileShell>
        <div className="flex h-full items-center justify-center bg-black text-white">
          <p>Loading profile...</p>
        </div>
      </MobileShell>
    )
  }

  if (!profile) {
    return (
      <MobileShell>
        <div className="flex h-full flex-col items-center justify-center bg-black px-6 text-center text-white">
          <p className="text-xl font-semibold">Profile not found</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 rounded-full bg-white px-5 py-2 text-black"
          >
            Go back
          </button>
        </div>
      </MobileShell>
    )
  }

  return (
    <MobileShell>
      <div className="relative h-full overflow-hidden bg-black text-white">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/85 via-black/40 to-transparent px-4 pb-8 pt-5">
          <div className="pointer-events-auto flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
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
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 text-lg font-semibold backdrop-blur">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={`${profile.username} avatar`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{profile.username?.charAt(0).toUpperCase() || 'U'}</span>
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
                    onClick={() => setEditOpen(true)}
                    className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:opacity-90"
                  >
                    Edit Profile
                  </button>
                </div>
              )}

              {!isOwnProfile && currentUserId && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                    className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
                  >
                    {followLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
                  </button>
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

        <div className="no-scrollbar h-full overflow-y-scroll bg-black px-3 pb-6 pt-56">
          {posts.length === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div>
                <p className="text-xl font-semibold">No posts yet</p>
                <p className="mt-2 text-zinc-400">
                  @{profile.username} has not posted anything yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {posts.map((post, index) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => setSelectedPostIndex(index)}
                  className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900 text-left"
                >
                  <img
                    src={post.image_url}
                    alt={post.caption || 'Post image'}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="truncate text-sm font-semibold text-white">
                      @{post.profiles?.username ?? 'unknown'}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-white/85">
                      {post.caption || 'No caption'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedPostIndex !== null && (
          <div className="absolute inset-0 z-40 bg-black/90 p-3">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPostIndex(null)}
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
                <div key={post.id} className="snap-start py-2">
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          </div>
        )}

        <EditProfilePanel
          open={editOpen}
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={async ({ username, fullName, bio, avatarFile }) => {
            if (!currentUserId) return

            let avatarUrl: string | null | undefined = undefined

            if (avatarFile) {
              avatarUrl = await uploadAvatarImage(currentUserId, avatarFile)
            }

            await updateProfile({
              userId: currentUserId,
              username,
              fullName,
              bio,
              avatarUrl,
            })

            await refreshProfilePage()
          }}
        />
      </div>
    </MobileShell>
  )
}