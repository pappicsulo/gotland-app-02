// ===== app/page.tsx =====

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { supabase } from '@/lib/supabase/client'
import { useFeed } from '@/hooks/useFeed'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useCreatePost } from '@/hooks/useCreatePost'
import { useHomePanels } from '@/hooks/useHomePanels'
import type { MusicTrack } from '@/lib/musicTracks'

import TopBar from '@/components/TopBar'
import CreatePostPanel from '@/components/CreatePostPanel'
import UserSearchPanel from '@/components/UserSearchPanel'
import NotificationsPanel from '@/components/NotificationsPanel'
import PostCard from '@/components/PostCard'
import MobileShell from '@/components/MobileShell'
import Toast from '@/components/Toast'

// =========================
// AUTH HELPERS
// =========================

function getAuthRedirectUrl() {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
  }

  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

// =========================
// PAGE COMPONENT
// =========================

export default function Home() {
  // =========================
  // AUTH
  // =========================

  const { user, authLoading } = useAuthUser()

  // =========================
  // PANELS
  // =========================

  const {
    showCreatePanel,
    showSearchPanel,
    showNotificationsPanel,

    toggleCreatePanel,
    toggleSearchPanel,
    toggleNotificationsPanel,

    closeCreatePanel,
    closeSearchPanel,
    closeNotificationsPanel,
  } = useHomePanels()

  // =========================
  // CREATE POST STATE
  // =========================

  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null)
  const [caption, setCaption] = useState('')

  // =========================
  // LOGIN STATE
  // =========================

  const [email, setEmail] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  // =========================
  // FEED / PLAYBACK STATE
  // =========================

  const [activePostId, setActivePostId] = useState<string | null>(null)

  // =========================
  // REFS
  // =========================

  const feedScrollRef = useRef<HTMLDivElement | null>(null)
  const postRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // =========================
  // FEED DATA / ACTIONS
  // =========================

  const {
    posts,
    likeCounts,
    likedPostIds,
    loading: feedLoading,
    hasMore,
    message: feedMessage,
    setMessage: setFeedMessage,
    upsertPost,
    refreshAll,
    loadMorePosts,
    handleLike,
  } = useFeed()

  // =========================
  // CREATE POST DATA / ACTIONS
  // =========================

  const {
    loading: createLoading,
    message: createMessage,
    uploadStatus,
    setMessage: setCreateMessage,
    handleCreatePost,
  } = useCreatePost({
    onPostCreated: (post) => {
      upsertPost(post)
    },
    onPostUpdated: (post) => {
      upsertPost(post)
    },
  })

  // =========================
  // DERIVED VALUES
  // =========================

  const visibleMessage = createMessage || feedMessage

  const readyPosts = useMemo(
    () => posts.filter((post) => post.upload_status === 'ready'),
    [posts]
  )

  const activeIndex = useMemo(
    () => readyPosts.findIndex((post) => post.id === activePostId),
    [readyPosts, activePostId]
  )

  // =========================
  // HELPERS
  // =========================

  function clearMessages() {
    setFeedMessage('')
    setCreateMessage('')
  }

  function resetCreatePostForm() {
    setCaption('')
    setMediaFile(null)
    setSelectedTrack(null)
  }

  // =========================
  // EFFECT: LOAD FEED AFTER AUTH
  // =========================

  useEffect(() => {
    if (authLoading) return
    void refreshAll(user?.id)
  }, [authLoading, user?.id, refreshAll])

  // =========================
  // EFFECT: AUTO-HIDE MESSAGES
  // =========================

  useEffect(() => {
    if (!visibleMessage) return

    const timeoutId = window.setTimeout(() => {
      setFeedMessage('')
      setCreateMessage('')
    }, 3500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [visibleMessage, setFeedMessage, setCreateMessage])

  // =========================
  // EFFECT: TRACK ACTIVE POST
  // =========================

  useEffect(() => {
    if (showCreatePanel || showSearchPanel || showNotificationsPanel) {
      setActivePostId(null)
      return
    }

    if (readyPosts.length === 0) {
      setActivePostId(null)
      return
    }

    const container = feedScrollRef.current
    if (!container) return

    const visibleRatios = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const postId = entry.target.getAttribute('data-post-id')
          if (!postId) continue

          if (entry.isIntersecting) {
            visibleRatios.set(postId, entry.intersectionRatio)
          } else {
            visibleRatios.delete(postId)
          }
        }

        let bestPostId: string | null = null
        let bestRatio = 0

        for (const [postId, ratio] of visibleRatios.entries()) {
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestPostId = postId
          }
        }

        if (bestPostId) {
          setActivePostId((prev) => (prev === bestPostId ? prev : bestPostId))
        }
      },
      {
        root: container,
        threshold: [0.35, 0.5, 0.65, 0.8],
      }
    )

    for (const post of readyPosts) {
      const el = postRefs.current[post.id]
      if (el) observer.observe(el)
    }

    return () => {
      observer.disconnect()
      visibleRatios.clear()
    }
  }, [readyPosts, showCreatePanel, showSearchPanel, showNotificationsPanel])

  // =========================
  // EFFECT: LOAD MORE POSTS
  // =========================

  useEffect(() => {
    if (!activePostId) return
    if (feedLoading || !hasMore) return

    const currentActiveIndex = readyPosts.findIndex(
      (post) => post.id === activePostId
    )

    if (currentActiveIndex === -1) return

    const shouldLoadMore = currentActiveIndex >= readyPosts.length - 3

    if (shouldLoadMore) {
      void loadMorePosts(user?.id)
    }
  }, [
    activePostId,
    readyPosts,
    feedLoading,
    hasMore,
    loadMorePosts,
    user?.id,
  ])

  // =========================
  // PANEL HANDLERS
  // =========================

  function handleToggleCreatePanel() {
    clearMessages()

    if (showCreatePanel) {
      resetCreatePostForm()
    }

    toggleCreatePanel()
  }

  function handleToggleSearchPanel() {
    clearMessages()
    toggleSearchPanel()
  }

  function handleToggleNotificationsPanel() {
    clearMessages()
    toggleNotificationsPanel()
  }

  function handleCloseCreatePanel() {
    resetCreatePostForm()
    closeCreatePanel()
  }

  // =========================
  // AUTH HANDLERS
  // =========================

  async function handleGoogleLogin() {
    clearMessages()
    setAuthBusy(true)

    try {
      const redirectTo = getAuthRedirectUrl()

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (error) {
        console.error(error)
        setFeedMessage('Google login failed.')
      }
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleEmailLogin() {
    clearMessages()

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setFeedMessage('Enter an email address.')
      return
    }

    setAuthBusy(true)

    try {
      const emailRedirectTo = getAuthRedirectUrl()

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: {
          emailRedirectTo,
        },
      })

      if (error) {
        console.error(error)
        setFeedMessage('Email login failed.')
        return
      }

      setFeedMessage('Check your email for your login link.')
      setEmail('')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleLogout() {
    clearMessages()
    setAuthBusy(true)

    try {
      await supabase.auth.signOut()
    } finally {
      setAuthBusy(false)
    }
  }

  // =========================
  // RENDER
  // =========================

  return (
    <MobileShell>
      <div className="relative h-full overflow-hidden bg-black text-white">
        <Toast message={visibleMessage} show={!!visibleMessage} />

        <TopBar
          user={user}
          showCreatePanel={showCreatePanel}
          onToggleCreatePanel={handleToggleCreatePanel}
          onToggleSearchPanel={handleToggleSearchPanel}
          onToggleNotificationsPanel={handleToggleNotificationsPanel}
          onLogout={handleLogout}
          onGoogleLogin={handleGoogleLogin}
          onEmailLogin={handleEmailLogin}
          email={email}
          onEmailChange={setEmail}
          authBusy={authBusy}
          createBusy={createLoading}
        />

        <CreatePostPanel
          show={showCreatePanel}
          loading={createLoading}
          message={visibleMessage}
          uploadStatus={uploadStatus}
          caption={caption}
          user={user}
          mediaFile={mediaFile}
          selectedTrack={selectedTrack}
          onCaptionChange={setCaption}
          onFileChange={setMediaFile}
          onSelectedTrackChange={setSelectedTrack}
          onSubmit={async (e) => {
            e.preventDefault()

            await handleCreatePost(
              user,
              mediaFile,
              caption,
              selectedTrack,
              () => {
                resetCreatePostForm()
                closeCreatePanel()
              }
            )
          }}
        />

        <UserSearchPanel
          open={showSearchPanel}
          onClose={closeSearchPanel}
        />

        <NotificationsPanel
          userId={user?.id ?? null}
          open={showNotificationsPanel}
          onClose={closeNotificationsPanel}
          onOpenPost={(postId) => {
            closeNotificationsPanel()
            setActivePostId(postId)

            window.setTimeout(() => {
              const el = postRefs.current[postId]
              if (!el) return

              el.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              })
            }, 100)
          }}
          onOpenProfile={(profileId) => {
            closeNotificationsPanel()
            window.location.href = `/profile/${profileId}`
          }}
        />

        {showCreatePanel || showSearchPanel || showNotificationsPanel ? (
          <div className="h-full bg-black" />
        ) : (
          <div
            ref={feedScrollRef}
            className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll bg-black px-2 py-2"
          >
            {readyPosts.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <div>
                  <p className="text-xl font-semibold">No posts yet</p>

                  <p className="mt-2 text-zinc-400">
                    Follow people or create the first post to build your feed.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {readyPosts.map((post, index) => {
                  const shouldPreload = index === activeIndex + 1

                  return (
                    <div
                      key={post.id}
                      data-post-id={post.id}
                      ref={(el) => {
                        postRefs.current[post.id] = el
                      }}
                      className="snap-center py-3"
                    >
                      <PostCard
                        post={post}
                        user={user}
                        currentUserId={user?.id ?? null}
                        isLiked={likedPostIds.has(post.id)}
                        likeCount={likeCounts[post.id] || 0}
                        onLike={(postId) => handleLike(user, postId)}
                        isActive={activePostId === post.id}
                        shouldPreload={shouldPreload}
                      />
                    </div>
                  )
                })}

                {feedLoading && hasMore && (
                  <div className="flex h-20 items-center justify-center text-sm text-zinc-500">
                    Loading more...
                  </div>
                )}

                {!hasMore && readyPosts.length > 0 && (
                  <div className="flex h-20 items-center justify-center text-xs text-zinc-600">
                    You are all caught up.
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </MobileShell>
  )
}