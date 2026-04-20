'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase/client'
import { useFeed } from '@/hooks/useFeed'
import { useAuthUser } from '@/hooks/useAuthUser'

import TopBar from '@/components/TopBar'
import CreatePostPanel from '@/components/CreatePostPanel'
import PostCard from '@/components/PostCard'
import MobileShell from '@/components/MobileShell'

function getAuthRedirectUrl() {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
  }

  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

export default function Home() {
  const router = useRouter()
  const { user, authLoading } = useAuthUser()

  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [email, setEmail] = useState('')
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const postRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const {
    posts,
    likeCounts,
    likedPostIds,
    loading,
    message,
    uploadStatus,
    setMessage,
    refreshAll,
    handleCreatePost,
    handleLike,
  } = useFeed()

  useEffect(() => {
    if (authLoading) return
    void refreshAll(user?.id)
  }, [authLoading, user?.id, refreshAll])

  useEffect(() => {
    if (!message) return

    const timeoutId = window.setTimeout(() => {
      setMessage('')
    }, 3500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [message, setMessage])

  const readyPosts = useMemo(
    () => posts.filter((post) => post.upload_status === 'ready'),
    [posts]
  )

  const visiblePostIds = useMemo(
    () => readyPosts.map((post) => post.id),
    [readyPosts]
  )

  // Safe fallback:
  // If no post is active yet, make the first ready post active immediately.
  useEffect(() => {
    if (showCreatePanel) return
    if (readyPosts.length === 0) return

    setActivePostId((prev) => prev ?? readyPosts[0].id)
  }, [readyPosts, showCreatePanel])

  useEffect(() => {
    if (showCreatePanel) {
      setActivePostId(null)
      observerRef.current?.disconnect()
      return
    }

    if (visiblePostIds.length === 0) {
      setActivePostId(null)
      observerRef.current?.disconnect()
      return
    }

    observerRef.current?.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visibleEntries.length === 0) return

        const topEntry = visibleEntries[0]
        const postId = topEntry.target.getAttribute('data-post-id')

        if (postId) {
          setActivePostId((prev) => (prev === postId ? prev : postId))
        }
      },
      {
        root: null,
        rootMargin: '-10% 0px -10% 0px',
        threshold: [0.55, 0.7, 0.85],
      }
    )

    for (const postId of visiblePostIds) {
      const el = postRefs.current[postId]
      if (el) {
        observerRef.current.observe(el)
      }
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [visiblePostIds, showCreatePanel])

  function handleToggleCreatePanel() {
    setMessage('')

    setShowCreatePanel((prev) => {
      const next = !prev

      if (!next) {
        setCaption('')
        setMediaFile(null)
      }

      return next
    })
  }

  async function handleGoogleLogin() {
    setMessage('')
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
        setMessage('Google login failed.')
      }
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleEmailLogin() {
    setMessage('')

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setMessage('Enter an email address.')
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
        setMessage('Email login failed.')
        return
      }

      setMessage('Check your email for your login link.')
      setEmail('')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleLogout() {
    setMessage('')
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
        <TopBar
          user={user}
          showCreatePanel={showCreatePanel}
          onToggleCreatePanel={handleToggleCreatePanel}
          onLogout={handleLogout}
          onGoogleLogin={handleGoogleLogin}
          onEmailLogin={handleEmailLogin}
          email={email}
          onEmailChange={setEmail}
          authBusy={authBusy}
          createBusy={loading}
        />

        <CreatePostPanel
          show={showCreatePanel}
          loading={loading}
          message={message}
          uploadStatus={uploadStatus}
          caption={caption}
          user={user}
          mediaFile={mediaFile}
          onCaptionChange={setCaption}
          onFileChange={setMediaFile}
          onSubmit={async (e) => {
            e.preventDefault()

            await handleCreatePost(user, mediaFile, caption, () => {
              setCaption('')
              setMediaFile(null)
              setShowCreatePanel(false)

              if (user?.id) {
                router.push(`/profile/${user.id}`)
              }
            })
          }}
        />

        {showCreatePanel ? (
          <div className="h-full bg-black" />
        ) : (
          <div className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll bg-black px-2 py-2">
            {readyPosts.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <div>
                  <p className="text-xl font-semibold">No posts yet</p>
                  <p className="mt-2 text-zinc-400">
                    Follow people or create the first post to build your feed.
                  </p>
                  {message && <p className="mt-4 text-red-400">{message}</p>}
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