'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'

import { useProfile } from '@/hooks/useProfile'
import { useAuthUser } from '@/hooks/useAuthUser'
import { updateProfile, uploadAvatarImage } from '@/lib/profile'
import { deletePostRecord } from '@/lib/posts'
import { stopAudio } from '@/lib/audio'
import EditProfilePanel from '@/components/EditProfilePanel'
import PostCard from '@/components/PostCard'
import MobileShell from '@/components/MobileShell'

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthUser()

  const profileId = params?.id as string
  const [editOpen, setEditOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  const overlayScrollRef = useRef<HTMLDivElement | null>(null)
  const postRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasScrolledToInitialPostRef = useRef(false)

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

  const readyPosts = useMemo(
    () => posts.filter((post) => post.upload_status === 'ready'),
    [posts]
  )

  function updateActivePostFromScroll() {
    const container = overlayScrollRef.current
    if (!container || readyPosts.length === 0) return

    const containerRect = container.getBoundingClientRect()
    const containerCenter = containerRect.top + containerRect.height / 2

    let closestPostId: string | null = null
    let closestDistance = Number.POSITIVE_INFINITY

    for (const post of readyPosts) {
      const el = postRefs.current[post.id]
      if (!el) continue

      const rect = el.getBoundingClientRect()
      const postCenter = rect.top + rect.height / 2
      const distance = Math.abs(postCenter - containerCenter)

      if (distance < closestDistance) {
        closestDistance = distance
        closestPostId = post.id
      }
    }

    if (closestPostId) {
      setActivePostId((prev) => (prev === closestPostId ? prev : closestPostId))
    }
  }

  async function handleDeletePost(
    postId: string,
    imageUrl?: string | null,
    videoUrl?: string | null,
    videoThumbnailUrl?: string | null
  ) {
    if (!currentUserId || deleteLoading) return

    setDeleteLoading(true)

    try {
      await deletePostRecord({
        postId,
        userId: currentUserId,
        imageUrl,
        videoUrl,
        videoThumbnailUrl,
      })

      const remainingReadyPosts = readyPosts.filter((post) => post.id !== postId)

      if (remainingReadyPosts.length === 0) {
        setSelectedPostId(null)
        setActivePostId(null)
        hasScrolledToInitialPostRef.current = false
        stopAudio()
      } else if (selectedPostId === postId) {
        const deletedIndex = readyPosts.findIndex((post) => post.id === postId)
        const nextIndex = Math.min(
          Math.max(deletedIndex, 0),
          remainingReadyPosts.length - 1
        )
        setSelectedPostId(remainingReadyPosts[nextIndex]?.id ?? null)
        hasScrolledToInitialPostRef.current = false
      }

      await refreshProfilePage()
    } catch (error: any) {
      console.error(error)
      alert(error?.message || 'Could not delete post.')
    } finally {
      setDeleteLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedPostId) return

    const container = overlayScrollRef.current
    if (!container) return

    const selectedPost = readyPosts.find((post) => post.id === selectedPostId)

    if (!selectedPost) {
      setSelectedPostId(null)
      setActivePostId(null)
      hasScrolledToInitialPostRef.current = false
      stopAudio()
      return
    }

    setActivePostId((prev) => prev ?? selectedPost.id)

    if (!hasScrolledToInitialPostRef.current) {
      const selectedEl = postRefs.current[selectedPost.id]

      if (selectedEl) {
        selectedEl.scrollIntoView({
          behavior: 'auto',
          block: 'start',
        })
        hasScrolledToInitialPostRef.current = true
      }
    }

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      scrollTimeoutRef.current = setTimeout(() => {
        updateActivePostFromScroll()
      }, 60)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })

    const rafId = requestAnimationFrame(() => {
      updateActivePostFromScroll()
    })

    return () => {
      container.removeEventListener('scroll', handleScroll)

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = null
      }

      cancelAnimationFrame(rafId)
    }
  }, [selectedPostId, readyPosts])

  useEffect(() => {
    if (selectedPostId === null) {
      setActivePostId(null)
      hasScrolledToInitialPostRef.current = false
      stopAudio()
    }
  }, [selectedPostId])

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
                    disabled={saveLoading}
                    className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
                  >
                    {saveLoading ? 'Saving...' : 'Edit Profile'}
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
              {posts.map((post) => {
                const isVideoPost = post.media_type === 'video' && !!post.video_url
                const isProcessing = post.upload_status === 'processing'
                const isFailed = post.upload_status === 'failed'
                const canOpenPost = post.upload_status === 'ready'

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => {
                      if (!canOpenPost) return
                      setSelectedPostId(post.id)
                    }}
                    className={`group relative aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900 text-left ${
                      canOpenPost ? '' : 'cursor-default'
                    }`}
                  >
                    {isVideoPost ? (
                      post.video_thumbnail_url ? (
                        <Image
                          src={post.video_thumbnail_url}
                          alt={post.caption || 'Video thumbnail'}
                          fill
                          sizes="(max-width: 430px) 50vw, 215px"
                          className={`object-cover transition duration-300 ${
                            canOpenPost ? 'group-hover:scale-105' : ''
                          } ${isProcessing || isFailed ? 'opacity-40' : ''}`}
                        />
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center bg-zinc-800 text-xs text-zinc-400 ${
                            isProcessing || isFailed ? 'opacity-40' : ''
                          }`}
                        >
                          Video
                        </div>
                      )
                    ) : post.image_url ? (
                      <Image
                        src={post.image_url}
                        alt={post.caption || 'Post image'}
                        fill
                        sizes="(max-width: 430px) 50vw, 215px"
                        className={`object-cover transition duration-300 ${
                          canOpenPost ? 'group-hover:scale-105' : ''
                        } ${isProcessing || isFailed ? 'opacity-40' : ''}`}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-xs text-zinc-400">
                        No media
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    {isVideoPost && !isProcessing && !isFailed && (
                      <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                        Video
                      </div>
                    )}

                    {isProcessing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/45 px-4 text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <p className="mt-3 text-sm font-semibold text-white">
                          Processing...
                        </p>
                        <p className="mt-1 text-xs text-zinc-300">
                          Your video is being prepared
                        </p>
                      </div>
                    )}

                    {isFailed && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 px-4 text-center">
                        <div className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-200">
                          Failed
                        </div>
                        <p className="mt-3 text-sm font-semibold text-white">
                          Video failed
                        </p>
                        <p className="mt-1 text-xs text-zinc-300">
                          {post.processing_error || 'Something went wrong'}
                        </p>
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="truncate text-sm font-semibold text-white">
                        @{post.profiles?.username ?? 'unknown'}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-white/85">
                        {post.caption || 'No caption'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {selectedPostId !== null &&
          readyPosts.some((post) => post.id === selectedPostId) && (
            <div className="absolute inset-0 z-40 bg-black/90 p-3">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPostId(null)
                    setActivePostId(null)
                    hasScrolledToInitialPostRef.current = false
                    stopAudio()
                  }}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur"
                >
                  Close
                </button>
              </div>

              <div
                ref={overlayScrollRef}
                className="no-scrollbar h-[calc(100%-56px)] snap-y snap-mandatory overflow-y-auto"
              >
                {readyPosts.map((post) => (
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
                      onDelete={handleDeletePost}
                      isActive={activePostId === post.id}
                    />
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
  alert('Save clicked')

  if (!currentUserId) {
    alert('No currentUserId found')
    return
  }

  if (saveLoading) {
    alert('Already saving')
    return
  }

  setSaveLoading(true)

  try {
    alert(`Updating profile for user: ${currentUserId}`)

    let avatarUrl: string | null | undefined = undefined

    if (avatarFile) {
      alert('Uploading avatar...')
      avatarUrl = await uploadAvatarImage(currentUserId, avatarFile)
      alert('Avatar uploaded')
    }

    alert('Updating profile row...')

    await updateProfile({
      userId: currentUserId,
      username,
      fullName,
      bio,
      avatarUrl,
    })

    alert('Profile update success')

    await refreshProfilePage()
    setEditOpen(false)
  } catch (error: any) {
    console.error(error)
    alert(error?.message || JSON.stringify(error) || 'Unknown save error')
  } finally {
    setSaveLoading(false)
  }
}}
        />
      </div>
    </MobileShell>
  )
}