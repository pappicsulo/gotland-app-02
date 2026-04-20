'use client'

import { useCallback, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Comment } from '@/types'

import {
  createComment,
  deleteComment,
  getCommentsByPostId,
} from '@/lib/comments'

type UseCommentsReturn = {
  comments: Comment[]
  content: string
  loading: boolean
  submitting: boolean
  deletingCommentId: string | null
  message: string
  setContent: React.Dispatch<React.SetStateAction<string>>
  setMessage: React.Dispatch<React.SetStateAction<string>>
  loadComments: () => Promise<void>
  handleSubmitComment: (user: User | null) => Promise<void>
  handleDeleteComment: (
    user: User | null,
    commentId: string
  ) => Promise<void>
  resetCommentsState: () => void
}

export function useComments(postId: string): UseCommentsReturn {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const loadComments = useCallback(async () => {
    setLoading(true)
    setMessage('')

    try {
      const data = await getCommentsByPostId(postId)
      setComments(data)
    } catch (error) {
      console.error(error)
      setMessage('Could not load comments.')
    } finally {
      setLoading(false)
    }
  }, [postId])

  const handleSubmitComment = useCallback(
    async (user: User | null) => {
      setMessage('')

      if (!user) {
        setMessage('You must be signed in to comment.')
        return
      }

      if (!content.trim()) {
        setMessage('Write a comment first.')
        return
      }

      setSubmitting(true)

      try {
        const newComment = await createComment({
          postId,
          userId: user.id,
          content,
        })

        setComments((prev) => [...prev, newComment])
        setContent('')
      } catch (error) {
        console.error(error)
        setMessage('Could not save comment.')
      } finally {
        setSubmitting(false)
      }
    },
    [postId, content]
  )

  const handleDeleteComment = useCallback(
    async (user: User | null, commentId: string) => {
      setMessage('')

      if (!user) {
        setMessage('You must be signed in to delete comments.')
        return
      }

      const previousComments = comments

      setDeletingCommentId(commentId)
      setComments((prev) => prev.filter((comment) => comment.id !== commentId))

      try {
        await deleteComment({
          commentId,
          userId: user.id,
        })
      } catch (error) {
        console.error(error)
        setComments(previousComments)
        setMessage('Could not delete comment.')
      } finally {
        setDeletingCommentId(null)
      }
    },
    [comments]
  )

  const resetCommentsState = useCallback(() => {
    setComments([])
    setContent('')
    setLoading(false)
    setSubmitting(false)
    setDeletingCommentId(null)
    setMessage('')
  }, [])

  return {
    comments,
    content,
    loading,
    submitting,
    deletingCommentId,
    message,
    setContent,
    setMessage,
    loadComments,
    handleSubmitComment,
    handleDeleteComment,
    resetCommentsState,
  }
}