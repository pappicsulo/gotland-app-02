// ===== useCreatePost.ts =====

'use client'

import { useCallback, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Post } from '@/types'
import type { MusicTrack } from '@/lib/musicTracks'

import { ensureUserProfile } from '@/lib/profiles'
import {
  compressVideo,
  generateVideoThumbnail,
} from '@/lib/videoCompression'
import {
  createPostRecord,
  updatePostProcessingState,
  uploadPostImage,
  uploadPostVideo,
  uploadVideoThumbnail,
} from '@/lib/posts'

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const MAX_VIDEO_INPUT_SIZE_MB = 150
const MAX_VIDEO_INPUT_SIZE_BYTES = MAX_VIDEO_INPUT_SIZE_MB * 1024 * 1024
const MAX_VIDEO_DURATION_SECONDS = 30

type UseCreatePostParams = {
  onPostCreated?: (post: Post) => void
  onPostUpdated?: (post: Post) => void
}

type UseCreatePostReturn = {
  loading: boolean
  message: string
  uploadStatus: string
  setMessage: React.Dispatch<React.SetStateAction<string>>
  setUploadStatus: React.Dispatch<React.SetStateAction<string>>
  handleCreatePost: (
    user: User | null,
    mediaFile: File | null,
    caption: string,
    selectedTrackOrOnSuccess?: MusicTrack | null | ((createdPost?: Post) => void),
    onSuccess?: (createdPost?: Post) => void
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

export function useCreatePost(
  params: UseCreatePostParams = {}
): UseCreatePostReturn {
  const { onPostCreated, onPostUpdated } = params

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')

  const handleCreatePost = useCallback(
    async (
      user: User | null,
      mediaFile: File | null,
      caption: string,
      selectedTrackOrOnSuccess?: MusicTrack | null | ((createdPost?: Post) => void),
      onSuccess?: (createdPost?: Post) => void
    ) => {
      const selectedTrack =
        typeof selectedTrackOrOnSuccess === 'function'
          ? null
          : selectedTrackOrOnSuccess ?? null

      const successCallback =
        typeof selectedTrackOrOnSuccess === 'function'
          ? selectedTrackOrOnSuccess
          : onSuccess

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
        const profileResult = await ensureUserProfile(user)

        if (!profileResult.success) {
          setMessage('Could not prepare your profile. Please try again.')
          return
        }

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
            audioUrl: selectedTrack?.url ?? null,
            audioStart: selectedTrack?.start ?? 0,
            audioDuration: selectedTrack?.duration ?? 10,
            uploadStatus: 'ready',
          })

          onPostCreated?.(createdPost)
          successCallback?.(createdPost)

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
          videoThumbnailUrl: null,

          // ✅ Viktig fix: musik sparas även på video-post
          audioUrl: selectedTrack?.url ?? null,
          audioStart: selectedTrack?.start ?? 0,
          audioDuration: selectedTrack?.duration ?? 10,
        })

        onPostCreated?.(pendingPost)
        successCallback?.(pendingPost)

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

          onPostUpdated?.(failedPost)
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

          onPostUpdated?.(failedPost)
          setMessage('Compressed video is invalid.')
          return
        }

        setUploadStatus('Generating thumbnail...')

        let thumbnailUrl: string | null = null

        try {
          const thumbnailFile = await generateVideoThumbnail(compressedVideoFile)
          thumbnailUrl = await uploadVideoThumbnail(user.id, thumbnailFile)
        } catch (error) {
          console.error('Thumbnail generation/upload failed:', error)
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

          onPostUpdated?.(failedPost)
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
          videoThumbnailUrl: thumbnailUrl,
        })

        onPostUpdated?.(readyPost)

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
    [onPostCreated, onPostUpdated]
  )

  return {
    loading,
    message,
    uploadStatus,
    setMessage,
    setUploadStatus,
    handleCreatePost,
  }
}