'use client'

import { useCallback, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Post } from '@/types'

import { ensureUserProfile } from '@/lib/profiles'
import { compressVideo } from '@/lib/videoCompression'
import {
  createPostRecord,
  deletePostRecord,
  getPosts,
  updatePostCaption,
  updatePostProcessingState,
  uploadPostImage,
  uploadPostVideo,
} from '@/lib/posts'
import {
  getLikeCountsForPosts,
  getUserLikedPostIds,
  likePost,
  unlikePost,
} from '@/lib/likes'

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const MAX_VIDEO_INPUT_SIZE_MB = 150
const MAX_VIDEO_INPUT_SIZE_BYTES = MAX_VIDEO_INPUT_SIZE_MB * 1024 * 1024
const MAX_VIDEO_DURATION_SECONDS = 30

type UseFeedReturn = {
  posts: Post[]
  likeCounts: Record<string, number>
  likedPostIds: Set<string>
  loading: boolean
  message: string
  uploadStatus: string
  setMessage: React.Dispatch<React.SetStateAction<string>>
  setUploadStatus: React.Dispatch<React.SetStateAction<string>>
  loadPosts: (currentUserId?: string) => Promise<Post[]>
  loadLikes: (postIds?: string[]) => Promise<void>
  loadUserLikes: (currentUserId: string, postIds?: string[]) => Promise<void>
  refreshAll: (currentUserId?: string) => Promise<void>
  handleCreatePost: (
    user: User | null,
    mediaFile: File | null,
    caption: string,
    onSuccess?: (createdPost?: Post) => void
  ) => Promise<void>
  handleLike: (user: User | null, postId: string) => Promise<void>
  handleDeletePost: (
    user: User | null,
    postId: string,
    imageUrl?: string | null,
    videoUrl?: string | null
  ) => Promise<void>
  handleEditPost: (
    user: User | null,
    postId: string,
    caption: string
  ) => Promise<void>
}

function getMediaKind(file: File): 'image' | 'video' | null {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
    }

    video.preload = 'metadata'
    video.src = objectUrl
    video.muted = true
    video.playsInline = true

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      cleanup()
      resolve(duration)
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('Could not read video metadata.'))
    }
  })
}

export function useFeed(): UseFeedReturn {
  const [posts, setPosts] = useState<Post[]>([])
  const [message, setMessage] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({})
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())

  const loadPosts = useCallback(async (currentUserId?: string): Promise<Post[]> => {
    try {
      const data = await getPosts(currentUserId)
      setPosts(data)
      return data
    } catch (error) {
      console.error(error)
      setMessage('Could not load posts.')
      return []
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

  const handleCreatePost = useCallback(
    async (
      user: User | null,
      mediaFile: File | null,
      caption: string,
      onSuccess?: (createdPost?: Post) => void
    ) => {
      setMessage('')
      setUploadStatus('')

      if (!user) {
        setMessage('You must be signed in first.')
        return
      }

      if (!mediaFile) {
        setMessage('Please select an image or video first.')
        return
      }

      const mediaKind = getMediaKind(mediaFile)

      if (!mediaKind) {
        setMessage('Only image and video files are supported.')
        return
      }

      setLoading(true)

      try {
        await ensureUserProfile(user)

        if (mediaKind === 'image') {
          setUploadStatus('Uploading image...')

          let imageUrl = ''

          try {
            imageUrl = await uploadPostImage(user.id, mediaFile)
          } catch (error) {
            console.error(error)
            setMessage('Could not upload the image.')
            return
          }

          const createdPost = await createPostRecord({
            userId: user.id,
            mediaType: 'image',
            imageUrl,
            caption,
            uploadStatus: 'ready',
          })

          setPosts((prev) => [createdPost, ...prev])
          setLikeCounts((prev) => ({
            [createdPost.id]: 0,
            ...prev,
          }))
          setLikedPostIds((prev) => new Set(prev))

          onSuccess?.(createdPost)
          setMessage('Post created.')
          setUploadStatus('')
          return
        }

        if (!ALLOWED_VIDEO_TYPES.includes(mediaFile.type)) {
          setMessage('Only MP4, MOV, and WEBM videos are supported.')
          return
        }

        if (mediaFile.size > MAX_VIDEO_INPUT_SIZE_BYTES) {
          setMessage(
            `Video is too large. Max input size is ${MAX_VIDEO_INPUT_SIZE_MB} MB.`
          )
          return
        }

        setUploadStatus('Preparing video...')

        let videoDuration = 0

        try {
          videoDuration = await readVideoDuration(mediaFile)
        } catch (error) {
          console.error(error)
          setMessage('Could not read video duration.')
          return
        }

        if (videoDuration <= 0) {
          setMessage('Could not read video duration.')
          return
        }

        if (videoDuration > MAX_VIDEO_DURATION_SECONDS) {
          setMessage(
            `Video is too long. Max duration is ${MAX_VIDEO_DURATION_SECONDS} seconds.`
          )
          return
        }

        const pendingPost = await createPostRecord({
          userId: user.id,
          mediaType: 'video',
          caption,
          videoDuration: Math.round(videoDuration),
          uploadStatus: 'processing',
          processingError: null,
          sourceVideoUrl: null,
          videoUrl: null,
        })

        setPosts((prev) => [pendingPost, ...prev])
        setLikeCounts((prev) => ({
          [pendingPost.id]: 0,
          ...prev,
        }))
        setLikedPostIds((prev) => new Set(prev))

        onSuccess?.(pendingPost)

        setUploadStatus('Compressing video...')

        let compressedVideoFile: File

        try {
          compressedVideoFile = await compressVideo(mediaFile)
        } catch (error) {
          console.error(error)

          const failedPost = await updatePostProcessingState({
            postId: pendingPost.id,
            userId: user.id,
            uploadStatus: 'failed',
            processingError: 'Could not compress the video.',
          })

          setPosts((prev) =>
            prev.map((post) => (post.id === pendingPost.id ? failedPost : post))
          )

          setMessage('Could not compress the video.')
          return
        }

        if (compressedVideoFile.size <= 0) {
          const failedPost = await updatePostProcessingState({
            postId: pendingPost.id,
            userId: user.id,
            uploadStatus: 'failed',
            processingError: 'Compressed video is invalid.',
          })

          setPosts((prev) =>
            prev.map((post) => (post.id === pendingPost.id ? failedPost : post))
          )

          setMessage('Compressed video is invalid.')
          return
        }

        setUploadStatus('Uploading video...')

        let videoUrl = ''

        try {
          videoUrl = await uploadPostVideo(user.id, compressedVideoFile)
        } catch (error) {
          console.error(error)

          const failedPost = await updatePostProcessingState({
            postId: pendingPost.id,
            userId: user.id,
            uploadStatus: 'failed',
            processingError: 'Could not upload the video.',
          })

          setPosts((prev) =>
            prev.map((post) => (post.id === pendingPost.id ? failedPost : post))
          )

          setMessage('Could not upload the video.')
          return
        }

        const readyPost = await updatePostProcessingState({
          postId: pendingPost.id,
          userId: user.id,
          uploadStatus: 'ready',
          processingError: null,
          videoUrl,
          videoDuration: Math.round(videoDuration),
        })

        setPosts((prev) =>
          prev.map((post) => (post.id === pendingPost.id ? readyPost : post))
        )

        setMessage('Video post created.')
        setUploadStatus('')
      } catch (error) {
        console.error(error)
        setMessage('Something went wrong while creating the post.')
      } finally {
        setLoading(false)
        setUploadStatus('')
      }
    },
    []
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
      videoUrl?: string | null
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
    uploadStatus,
    setMessage,
    setUploadStatus,
    loadPosts,
    loadLikes,
    loadUserLikes,
    refreshAll,
    handleCreatePost,
    handleLike,
    handleDeletePost,
    handleEditPost,
  }
}