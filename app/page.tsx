'use client'

import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase/client'
import { useFeed } from '@/hooks/useFeed'
import { useAuthUser } from '@/hooks/useAuthUser'

import TopBar from '@/components/TopBar'
import CreatePostPanel from '@/components/CreatePostPanel'
import PostCard from '@/components/PostCard'
import MobileShell from '@/components/MobileShell'

export default function Home() {
  const { user, authLoading } = useAuthUser()

  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [email, setEmail] = useState('')

  const {
    posts,
    likeCounts,
    likedPostIds,
    loading,
    message,
    setMessage,
    refreshAll,
    handleCreatePost,
    handleLike,
  } = useFeed()

  useEffect(() => {
    if (authLoading) return
    refreshAll(user?.id)
  }, [authLoading, user, refreshAll])

  async function handleGoogleLogin() {
    setMessage('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000',
      },
    })

    if (error) {
      setMessage('Login failed')
    }
  }

  async function handleEmailLogin() {
    setMessage('')

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setMessage('Enter an email address.')
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: 'http://localhost:3000',
      },
    })

    if (error) {
      console.error(error)
      setMessage('Email login failed.')
      return
    }

    setMessage('Check your email for your login link.')
    setEmail('')
  }

  async function handleLogout() {
    setMessage('')
    await supabase.auth.signOut()
  }

  return (
    <MobileShell>
      <div className="relative h-full overflow-hidden bg-black text-white">
        <TopBar
          user={user}
          showCreatePanel={showCreatePanel}
          onToggleCreatePanel={() => setShowCreatePanel((prev) => !prev)}
          onLogout={handleLogout}
          onGoogleLogin={handleGoogleLogin}
          onEmailLogin={handleEmailLogin}
          email={email}
          onEmailChange={setEmail}
        />

        <CreatePostPanel
          show={showCreatePanel}
          loading={loading}
          message={message}
          caption={caption}
          user={user}
          onCaptionChange={setCaption}
          onFileChange={setImageFile}
          onSubmit={async (e) => {
            e.preventDefault()

            await handleCreatePost(user, imageFile, caption, () => {
              setCaption('')
              setImageFile(null)
              setShowCreatePanel(false)
            })
          }}
        />

        <div className="no-scrollbar h-full snap-y snap-mandatory overflow-y-scroll bg-black px-2 py-2">
          {posts.length === 0 ? (
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
            posts.map((post) => (
              <div key={post.id} className="snap-center py-3">
                <PostCard
                  post={post}
                  user={user}
                  isLiked={likedPostIds.has(post.id)}
                  likeCount={likeCounts[post.id] || 0}
                  onLike={(postId) => handleLike(user, postId)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </MobileShell>
  )
}