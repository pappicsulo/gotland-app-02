// ===== app/page.tsx =====

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { supabase } from '@/lib/supabase/client'
import { useFeed } from '@/hooks/useFeed'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useCreatePost } from '@/hooks/useCreatePost'
import type { MusicTrack } from '@/lib/musicTracks'

import TopBar from '@/components/TopBar'
import CreatePostPanel from '@/components/CreatePostPanel'
import UserSearchPanel from '@/components/UserSearchPanel'
import PostCard from '@/components/PostCard'
import MobileShell from '@/components/MobileShell'
import Toast from '@/components/Toast'

function getAuthRedirectUrl() {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
  }

  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

export default function Home() {
  const { user, authLoading } = useAuthUser()

  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [showSearchPanel, setShowSearchPanel] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null)
  const [caption, setCaption] = useState('')
  const [email, setEmail] = useState('')
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)

  const feedScrollRef = useRef<HTMLDivElement | null>(null)
  const postRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    posts,
    likeCounts,
    likedPostIds,
    message: feedMessage,
    setMessage: setFeedMessage,
    upsertPost,
    refreshAll,
    handleLike,
  } = useFeed()

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

  const visibleMessage = createMessage || feedMessage

  const readyPosts = useMemo(
    () => posts.filter((post) => post.upload_status === 'ready'),
    [posts]
  )

  const updateActivePostFromScroll = useCallback(() => {
    const container = feedScrollRef.current
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
  }, [readyPosts])

  const handleFeedScroll = useCallback(() => {
  if (scrollTimeoutRef.current) {
    clearTimeout(scrollTimeoutRef.current)
  }

  scrollTimeoutRef.current = setTimeout(() => {
    updateActivePostFromScroll()
  }, 90)

}, [updateActivePostFromScroll])
  useEffect(() => {
    if (authLoading) return
    void refreshAll(user?.id)
  }, [authLoading, user?.id, refreshAll])

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

  useEffect(() => {
    if (showCreatePanel || showSearchPanel) {
      setActivePostId(null)
      return
    }

    if (readyPosts.length === 0) {
      setActivePostId(null)
      return
    }

    const rafId = window.requestAnimationFrame(() => {
      updateActivePostFromScroll()
    })

    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [readyPosts, showCreatePanel, showSearchPanel, updateActivePostFromScroll])

  useEffect(() => {
    return () => {
       if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  function clearMessages() {
    setFeedMessage('')
    setCreateMessage('')
  }

  function handleToggleCreatePanel() {
    clearMessages()

    setShowCreatePanel((prev) => {
      const next = !prev

      if (next) {
        setShowSearchPanel(false)
      }

      if (!next) {
        setCaption('')
        setMediaFile(null)
        setSelectedTrack(null)
      }

      return next
    })
  }

  function handleToggleSearchPanel() {
    clearMessages()

    setShowSearchPanel((prev) => {
      const next = !prev

      if (next) {
        setShowCreatePanel(false)
      }

      return next
    })
  }

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

  return (
    <MobileShell>
      <div className="relative h-full overflow-hidden bg-black text-white">
        <Toast message={visibleMessage} show={!!visibleMessage} />

        <TopBar
          user={user}
          showCreatePanel={showCreatePanel}
          onToggleCreatePanel={handleToggleCreatePanel}
          onToggleSearchPanel={handleToggleSearchPanel}
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
                setCaption('')
                setMediaFile(null)
                setSelectedTrack(null)
                setShowCreatePanel(false)
              }
            )
          }}
        />

        <UserSearchPanel
          open={showSearchPanel}
          onClose={() => setShowSearchPanel(false)}
        />

        {showCreatePanel || showSearchPanel ? (
          <div className="h-full bg-black" />
        ) : (
          <div
            ref={feedScrollRef}
            onScroll={handleFeedScroll}
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
              readyPosts.map((post) => (
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
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </MobileShell>
  )
}