// ===== useProfileOverlay.ts =====

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { Post } from '@/types'
import { stopAudio } from '@/lib/audio'

// =========================
// HOOK
// =========================

export function useProfileOverlay(readyPosts: Post[]) {
  // =========================
  // STATE
  // =========================

  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [activePostId, setActivePostId] = useState<string | null>(null)

  // =========================
  // REFS
  // =========================

  const overlayScrollRef = useRef<HTMLDivElement | null>(null)
  const postRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasScrolledToInitialPostRef = useRef(false)

  // =========================
  // DERIVED VALUES
  // =========================

  const overlayIsOpen =
    selectedPostId !== null &&
    readyPosts.some((post) => post.id === selectedPostId)

  // =========================
  // HELPERS
  // =========================

  const updateActivePostFromScroll = useCallback(() => {
    const container = overlayScrollRef.current
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

  // =========================
  // HANDLERS
  // =========================

  function openOverlay(postId: string) {
    setSelectedPostId(postId)
  }

  function closeOverlay() {
    setSelectedPostId(null)
    setActivePostId(null)
    hasScrolledToInitialPostRef.current = false
    stopAudio()
  }

  function handleDeletedOverlayPost(postId: string) {
    const remainingReadyPosts = readyPosts.filter((post) => post.id !== postId)

    if (remainingReadyPosts.length === 0) {
      closeOverlay()
      return
    }

    if (selectedPostId === postId) {
      const deletedIndex = readyPosts.findIndex((post) => post.id === postId)
      const nextIndex = Math.min(
        Math.max(deletedIndex, 0),
        remainingReadyPosts.length - 1
      )

      setSelectedPostId(remainingReadyPosts[nextIndex]?.id ?? null)
      hasScrolledToInitialPostRef.current = false
    }
  }

  // =========================
  // EFFECT: OVERLAY SCROLL TRACKING
  // =========================

  useEffect(() => {
    if (!selectedPostId) return

    const container = overlayScrollRef.current
    if (!container) return

    const selectedPost = readyPosts.find((post) => post.id === selectedPostId)

    if (!selectedPost) {
      closeOverlay()
      return
    }

    setActivePostId((prev) => prev ?? selectedPost.id)

    if (!hasScrolledToInitialPostRef.current) {
      const selectedEl = postRefs.current[selectedPost.id]

      if (selectedEl) {
        selectedEl.scrollIntoView({
          behavior: 'auto',
          block: 'start',
        })

        hasScrolledToInitialPostRef.current = true
      }
    }

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      scrollTimeoutRef.current = setTimeout(() => {
        updateActivePostFromScroll()
      }, 60)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })

    const rafId = requestAnimationFrame(() => {
      updateActivePostFromScroll()
    })

    return () => {
      container.removeEventListener('scroll', handleScroll)

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
        scrollTimeoutRef.current = null
      }

      cancelAnimationFrame(rafId)
    }
  }, [selectedPostId, readyPosts, updateActivePostFromScroll])

  // =========================
  // EFFECT: CLOSE OVERLAY CLEANUP
  // =========================

  useEffect(() => {
    if (selectedPostId === null) {
      setActivePostId(null)
      hasScrolledToInitialPostRef.current = false
      stopAudio()
    }
  }, [selectedPostId])

  // =========================
  // RETURN
  // =========================

  return {
    selectedPostId,
    activePostId,
    overlayIsOpen,
    overlayScrollRef,
    postRefs,
    openOverlay,
    closeOverlay,
    handleDeletedOverlayPost,
  }
}