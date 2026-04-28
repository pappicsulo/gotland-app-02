// ===== useFeed.ts =====

'use client'

import { useCallback, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Post } from '@/types'

import {
  deletePostRecord,
  getPosts,
  updatePostCaption,
} from '@/lib/posts'

import {
  getLikeCountsForPosts,
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
  upsertPost: (post: Post) => void
  loadPosts: (currentUserId?: string) => Promise<Post[]>
  loadLikes: (postIds?: string[]) => Promise<void>
  loadUserLikes: (currentUserId: string, postIds?: string[]) => Promise<void>
  refreshAll: (currentUserId?: string) => Promise<void>
  handleLike: (user: User | null, postId: string) => Promise<void>
  handleDeletePost: (
    user: User | null,
    postId: string,
    imageUrl?: string | null,
    videoUrl?: string | null,
    videoThumbnailUrl?: string | null
  ) => Promise<void>
  handleEditPost: (
    user: User | null,
    postId: string,
    caption: string
  ) => Promise<void>
}

export function useFeed(): UseFeedReturn {
  const [posts, setPosts] = useState<Post[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())

  const upsertPost = useCallback((post: Post) => {
    setPosts((prev) => {
      const exists = prev.some((item) => item.id === post.id)

      if (exists) {
        return prev.map((item) => (item.id === post.id ? post : item))
      }

      return [post, ...prev]
    })
  }, [])

  const loadPosts = useCallback(async (currentUserId?: string): Promise<Post[]> => {
    setLoading(true)

    try {
      const data = await getPosts(currentUserId)
      setPosts(data)
      return data
    } catch (error) {
      console.error(error)
      setMessage('Could not load posts.')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const loadLikes = useCallback(
    async (postIds?: string[]) => {
      try {
        const targetPostIds = postIds ?? posts.map((post) => post.id)
        const counts = await getLikeCountsForPosts(targetPostIds)
        setLikeCounts(counts)
      } catch (error) {
        console.error(error)
      }
    },
    [posts]
  )

  const loadUserLikes = useCallback(
    async (currentUserId: string, postIds?: string[]) => {
      try {
        const targetPostIds = postIds ?? posts.map((post) => post.id)
        const likedIds = await getUserLikedPostIds(currentUserId, targetPostIds)
        setLikedPostIds(likedIds)
      } catch (error) {
        console.error(error)
      }
    },
    [posts]
  )

  const refreshAll = useCallback(
    async (currentUserId?: string) => {
      const loadedPosts = await loadPosts(currentUserId)
      const loadedPostIds = loadedPosts.map((post) => post.id)

      await loadLikes(loadedPostIds)

      if (currentUserId) {
        await loadUserLikes(currentUserId, loadedPostIds)
      } else {
        setLikedPostIds(new Set())
      }
    },
    [loadPosts, loadLikes, loadUserLikes]
  )

  const handleLike = useCallback(
    async (user: User | null, postId: string) => {
      setMessage('')

      if (!user) {
        setMessage('You must be signed in to like posts.')
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

          setMessage('Could not remove like.')
        }

        return
      }

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

        setMessage('Could not like the post.')
      }
    },
    [likedPostIds, likeCounts]
  )

  const handleDeletePost = useCallback(
    async (
      user: User | null,
      postId: string,
      imageUrl?: string | null,
      videoUrl?: string | null,
      videoThumbnailUrl?: string | null
    ) => {
      setMessage('')

      if (!user) {
        setMessage('You must be signed in first.')
        return
      }

      const previousPosts = posts
      const previousLikeCounts = likeCounts
      const previousLikedPostIds = likedPostIds

      setPosts((prev) => prev.filter((post) => post.id !== postId))

      setLikeCounts((prev) => {
        const next = { ...prev }
        delete next[postId]
        return next
      })

      setLikedPostIds((prev) => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })

      try {
        await deletePostRecord({
          postId,
          userId: user.id,
          imageUrl,
          videoUrl,
          videoThumbnailUrl,
        })

        setMessage('Post deleted.')
      } catch (error) {
        console.error(error)
        setPosts(previousPosts)
        setLikeCounts(previousLikeCounts)
        setLikedPostIds(previousLikedPostIds)
        setMessage('Could not delete post.')
      }
    },
    [posts, likeCounts, likedPostIds]
  )

  const handleEditPost = useCallback(
    async (user: User | null, postId: string, caption: string) => {
      setMessage('')

      if (!user) {
        setMessage('You must be signed in first.')
        return
      }

      const previousPosts = posts

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                caption: caption.trim() || null,
              }
            : post
        )
      )

      try {
        const updatedPost = await updatePostCaption({
          postId,
          userId: user.id,
          caption,
        })

        setPosts((prev) =>
          prev.map((post) => (post.id === postId ? updatedPost : post))
        )

        setMessage('Post updated.')
      } catch (error) {
        console.error(error)
        setPosts(previousPosts)
        setMessage('Could not update post.')
      }
    },
    [posts]
  )

  return {
    posts,
    likeCounts,
    likedPostIds,
    loading,
    message,
    setMessage,
    upsertPost,
    loadPosts,
    loadLikes,
    loadUserLikes,
    refreshAll,
    handleLike,
    handleDeletePost,
    handleEditPost,
  }
}