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

const PAGE_SIZE = 8

type UseFeedReturn = {
  posts: Post[]
  likeCounts: Record<string, number>
  likedPostIds: Set<string>
  loading: boolean
  hasMore: boolean
  message: string
  setMessage: React.Dispatch<React.SetStateAction<string>>
  upsertPost: (post: Post) => void
  loadMorePosts: (currentUserId?: string) => Promise<void>
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
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const upsertPost = useCallback((post: Post) => {
    setPosts((prev) => {
      const exists = prev.some((item) => item.id === post.id)

      if (exists) {
        return prev.map((item) => (item.id === post.id ? post : item))
      }

      return [post, ...prev]
    })
  }, [])

  const refreshAll = useCallback(async (currentUserId?: string) => {
    setLoading(true)
    setMessage('')

    try {
      const data = await getPosts(currentUserId, {
        limit: PAGE_SIZE,
        offset: 0,
      })

      setPosts(data)
      setOffset(data.length)
      setHasMore(data.length === PAGE_SIZE)

      const postIds = data.map((post) => post.id)

      const counts = await getLikeCountsForPosts(postIds)
      setLikeCounts(counts)

      if (currentUserId) {
        const likedIds = await getUserLikedPostIds(currentUserId, postIds)
        setLikedPostIds(likedIds)
      } else {
        setLikedPostIds(new Set())
      }
    } catch (error) {
      console.error(error)
      setMessage('Could not load posts.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMorePosts = useCallback(
    async (currentUserId?: string) => {
      if (loading || !hasMore) return

      setLoading(true)

      try {
        const data = await getPosts(currentUserId, {
          limit: PAGE_SIZE,
          offset,
        })

        if (data.length === 0) {
          setHasMore(false)
          return
        }

        setPosts((prev) => {
          const existingIds = new Set(prev.map((post) => post.id))
          const newPosts = data.filter((post) => !existingIds.has(post.id))

          return [...prev, ...newPosts]
        })

        setOffset((prev) => prev + data.length)
        setHasMore(data.length === PAGE_SIZE)

        const postIds = data.map((post) => post.id)

        const counts = await getLikeCountsForPosts(postIds)

        setLikeCounts((prev) => ({
          ...prev,
          ...counts,
        }))

        if (currentUserId) {
          const likedIds = await getUserLikedPostIds(currentUserId, postIds)

          setLikedPostIds((prev) => {
            const next = new Set(prev)

            for (const postId of likedIds) {
              next.add(postId)
            }

            return next
          })
        }
      } catch (error) {
        console.error(error)
        setMessage('Could not load more posts.')
      } finally {
        setLoading(false)
      }
    },
    [loading, hasMore, offset]
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
    hasMore,
    message,
    setMessage,
    upsertPost,
    loadMorePosts,
    refreshAll,
    handleLike,
    handleDeletePost,
    handleEditPost,
  }
}