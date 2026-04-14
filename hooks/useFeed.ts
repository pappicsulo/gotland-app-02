'use client'

import { useCallback, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Post } from '@/types'

import { ensureUserProfile } from '@/lib/profiles'
import { createPostRecord, getPosts, uploadPostImage } from '@/lib/posts'
import {
  getAllLikes,
  getUserLikedPostIds,
  likePost,
  unlikePost,
} from '@/lib/likes'

type UseFeedReturn = {
  posts: Post[]
  likeCounts: Record<string, number>
  likedPostIds: Set<string>
  loading: boolean
  message: string
  setMessage: React.Dispatch<React.SetStateAction<string>>
  loadPosts: (currentUserId?: string) => Promise<void>
  loadLikes: () => Promise<void>
  loadUserLikes: (currentUserId: string) => Promise<void>
  refreshAll: (currentUserId?: string) => Promise<void>
  handleCreatePost: (
    user: User | null,
    imageFile: File | null,
    caption: string,
    onSuccess?: () => void
  ) => Promise<void>
  handleLike: (user: User | null, postId: string) => Promise<void>
}

export function useFeed(): UseFeedReturn {
  const [posts, setPosts] = useState<Post[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())

  const loadPosts = useCallback(async (currentUserId?: string) => {
    try {
      const data = await getPosts(currentUserId)
      setPosts(data)
    } catch (error) {
      console.error(error)
      setMessage('Kunde inte hämta posts')
    }
  }, [])

  const loadLikes = useCallback(async () => {
    try {
      const counts = await getAllLikes()
      setLikeCounts(counts)
    } catch (error) {
      console.error(error)
    }
  }, [])

  const loadUserLikes = useCallback(async (currentUserId: string) => {
    try {
      const likedIds = await getUserLikedPostIds(currentUserId)
      setLikedPostIds(likedIds)
    } catch (error) {
      console.error(error)
    }
  }, [])

  const refreshAll = useCallback(
    async (currentUserId?: string) => {
      await loadPosts(currentUserId)
      await loadLikes()

      if (currentUserId) {
        await loadUserLikes(currentUserId)
      } else {
        setLikedPostIds(new Set())
      }
    },
    [loadPosts, loadLikes, loadUserLikes]
  )

  const handleCreatePost = useCallback(
    async (
      user: User | null,
      imageFile: File | null,
      caption: string,
      onSuccess?: () => void
    ) => {
      setMessage('')

      if (!user) {
        setMessage('Du måste logga in först.')
        return
      }

      if (!imageFile) {
        setMessage('Välj en bild först.')
        return
      }

      setLoading(true)

      try {
        let imageUrl = ''

        try {
          imageUrl = await uploadPostImage(user.id, imageFile)
        } catch (error) {
          console.error(error)
          setMessage('Kunde inte ladda upp bilden.')
          return
        }

        await ensureUserProfile(user)

        try {
          await createPostRecord({
            userId: user.id,
            imageUrl,
            caption,
          })
        } catch (error) {
          console.error(error)
          setMessage('Bilden laddades upp men posten kunde inte sparas.')
          return
        }

        onSuccess?.()
        setMessage('Post skapad!')
        await refreshAll(user.id)
      } catch (error) {
        console.error(error)
        setMessage('Något gick fel vid uppladdning.')
      } finally {
        setLoading(false)
      }
    },
    [refreshAll]
  )

  const handleLike = useCallback(
    async (user: User | null, postId: string) => {
      setMessage('')

      if (!user) {
        setMessage('Du måste logga in för att likea.')
        return
      }

      const hasLiked = likedPostIds.has(postId)
      const previousCount = likeCounts[postId] || 0

      if (hasLiked) {
        setLikeCounts((prev) => ({
          ...prev,
          [postId]: Math.max(previousCount - 1, 0),
        }))

        setLikedPostIds((prev) => {
          const next = new Set(prev)
          next.delete(postId)
          return next
        })

        try {
          await unlikePost(user.id, postId)
        } catch (error) {
          console.error(error)

          setLikeCounts((prev) => ({
            ...prev,
            [postId]: previousCount,
          }))

          setLikedPostIds((prev) => {
            const next = new Set(prev)
            next.add(postId)
            return next
          })

          setMessage('Kunde inte ta bort like.')
          return
        }
      } else {
        setLikeCounts((prev) => ({
          ...prev,
          [postId]: previousCount + 1,
        }))

        setLikedPostIds((prev) => {
          const next = new Set(prev)
          next.add(postId)
          return next
        })

        try {
          await likePost(user.id, postId)
        } catch (error) {
          console.error(error)

          setLikeCounts((prev) => ({
            ...prev,
            [postId]: previousCount,
          }))

          setLikedPostIds((prev) => {
            const next = new Set(prev)
            next.delete(postId)
            return next
          })

          setMessage('Kunde inte likea posten.')
          return
        }
      }

      await refreshAll(user.id)
    },
    [likedPostIds, likeCounts, refreshAll]
  )

  return {
    posts,
    likeCounts,
    likedPostIds,
    loading,
    message,
    setMessage,
    loadPosts,
    loadLikes,
    loadUserLikes,
    refreshAll,
    handleCreatePost,
    handleLike,
  }
}