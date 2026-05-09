// ===== id-page.tsx =====

'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { useProfile } from '@/hooks/useProfile'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useProfileOverlay } from '@/hooks/useProfileOverlay'
import { updateProfile, uploadAvatarImage } from '@/lib/profile'
import { deletePostRecord } from '@/lib/posts'

import EditProfilePanel from '@/components/EditProfilePanel'
import MobileShell from '@/components/MobileShell'
import ProfileHeader from '@/components/ProfileHeader'
import ProfilePostGrid from '@/components/ProfilePostGrid'
import ProfilePostOverlay from '@/components/ProfilePostOverlay'

// =========================
// PAGE
// =========================

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthUser()

  const profileId = params?.id as string

  // =========================
  // STATE
  // =========================

  const [editOpen, setEditOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  // =========================
  // PROFILE DATA
  // =========================

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

  // =========================
  // DERIVED VALUES
  // =========================

  const readyPosts = useMemo(
    () => posts.filter((post) => post.upload_status === 'ready'),
    [posts]
  )

  // =========================
  // OVERLAY LOGIC
  // =========================

  const {
    activePostId,
    overlayIsOpen,
    overlayScrollRef,
    postRefs,
    openOverlay,
    closeOverlay,
    handleDeletedOverlayPost,
  } = useProfileOverlay(readyPosts)

  // =========================
  // HANDLERS
  // =========================

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

      handleDeletedOverlayPost(postId)
      await refreshProfilePage()
    } catch (error: any) {
      console.error(error)
      alert(error?.message || 'Could not delete post.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // =========================
  // LOADING / EMPTY STATES
  // =========================

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

  // =========================
  // RENDER
  // =========================

  return (
    <MobileShell>
      <div className="relative h-full overflow-hidden bg-black text-white">
        <ProfileHeader
          profile={profile}
          user={user}
          currentUserId={currentUserId}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          followLoading={followLoading}
          saveLoading={saveLoading}
          followerCount={followerCount}
          followingCount={followingCount}
          message={message}
          onBack={() => router.back()}
          onEditProfile={() => setEditOpen(true)}
          onToggleFollow={handleToggleFollow}
        />

        <div className="no-scrollbar h-full overflow-y-scroll bg-black px-3 pb-6 pt-56">
          <ProfilePostGrid
            posts={posts}
            username={profile.username}
            onOpenPost={openOverlay}
          />
        </div>

        {overlayIsOpen && (
          <ProfilePostOverlay
            posts={readyPosts}
            user={user}
            currentUserId={currentUserId}
            activePostId={activePostId}
            overlayScrollRef={overlayScrollRef}
            postRefs={postRefs}
            onClose={closeOverlay}
            onDeletePost={handleDeletePost}
          />
        )}

        <EditProfilePanel
          open={editOpen}
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={async ({ username, fullName, bio, avatarFile }) => {
            if (!currentUserId || saveLoading) return

            setSaveLoading(true)

            try {
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
              setEditOpen(false)
            } catch (error) {
              console.error(error)
            } finally {
              setSaveLoading(false)
            }
          }}
        />
      </div>
    </MobileShell>
  )
}