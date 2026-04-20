'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { supabase } from '@/lib/supabase/client'
import type { Post } from '@/types'
import {
  followUser,
  getFollowerCount,
  getFollowingCount,
  isFollowingUser,
  unfollowUser,
} from '@/lib/follows'

export type ProfileData = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
}

type UseProfileReturn = {
  profile: ProfileData | null
  posts: Post[]
  loading: boolean
  message: string
  setMessage: React.Dispatch<React.SetStateAction<string>>
  currentUserId: string | null
  isOwnProfile: boolean
  isFollowing: boolean
  followLoading: boolean
  followerCount: number
  followingCount: number
  refreshProfilePage: () => Promise<void>
  handleToggleFollow: () => Promise<void>
}

export function useProfile(profileId: string): UseProfileReturn {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)

  const refreshProfilePage = useCallback(async () => {
    if (!profileId) return

    const isInitialLoad = profile === null
    if (isInitialLoad) {
      setLoading(true)
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const signedInUserId = user?.id ?? null
      setCurrentUserId(signedInUserId)
      setIsOwnProfile(signedInUserId === profileId)

      const profileQuery = supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio')
        .eq('id', profileId)
        .maybeSingle()

      const postsQuery = supabase
        .from('posts')
        .select(`
          id,
          media_type,
          image_url,
          video_url,
          video_duration,
          caption,
          created_at,
          user_id,
          audio_url,
          audio_start,
          audio_duration,
          upload_status,
          processing_error,
          source_video_url,
          profiles:profiles!posts_user_id_fkey (
            username,
            avatar_url
          )
        `)
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })

      const followerCountQuery = getFollowerCount(profileId)
      const followingCountQuery = getFollowingCount(profileId)

      const followStateQuery =
        signedInUserId && signedInUserId !== profileId
          ? isFollowingUser(signedInUserId, profileId)
          : Promise.resolve(false)

      const [
        profileResult,
        postsResult,
        followers,
        following,
        followState,
      ] = await Promise.all([
        profileQuery,
        postsQuery,
        followerCountQuery,
        followingCountQuery,
        followStateQuery,
      ])

      if (profileResult.error) {
        console.error(profileResult.error)
        setMessage('Could not load profile.')
        setProfile(null)
        setPosts([])
        setFollowerCount(0)
        setFollowingCount(0)
        setIsFollowing(false)
        return
      }

      if (postsResult.error) {
        console.error(postsResult.error)
        setMessage('Could not load user posts.')
        setProfile(profileResult.data as ProfileData)
        setPosts([])
        setFollowerCount(followers)
        setFollowingCount(following)
        setIsFollowing(followState)
        return
      }

      setProfile(profileResult.data as ProfileData)
      setPosts((postsResult.data ?? []) as unknown as Post[])
      setFollowerCount(followers)
      setFollowingCount(following)
      setIsFollowing(followState)
    } catch (error) {
      console.error(error)
      setMessage('Something went wrong while loading the profile.')
    } finally {
      if (isInitialLoad) {
        setLoading(false)
      }
    }
  }, [profileId, profile])

  useEffect(() => {
    void refreshProfilePage()
  }, [refreshProfilePage])

  const hasProcessingPosts = useMemo(
    () => posts.some((post) => post.upload_status === 'processing'),
    [posts]
  )

  useEffect(() => {
    if (!hasProcessingPosts) return

    const intervalId = window.setInterval(() => {
      void refreshProfilePage()
    }, 3000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [hasProcessingPosts, refreshProfilePage])

  const handleToggleFollow = useCallback(async () => {
    if (!currentUserId || !profileId || currentUserId === profileId) return

    setFollowLoading(true)
    setMessage('')

    const previousIsFollowing = isFollowing
    const previousFollowerCount = followerCount

    try {
      if (isFollowing) {
        setIsFollowing(false)
        setFollowerCount((prev) => Math.max(0, prev - 1))
        await unfollowUser(currentUserId, profileId)
      } else {
        setIsFollowing(true)
        setFollowerCount((prev) => prev + 1)
        await followUser(currentUserId, profileId)
      }
    } catch (error) {
      console.error(error)
      setIsFollowing(previousIsFollowing)
      setFollowerCount(previousFollowerCount)
      setMessage('Could not update follow status.')
    } finally {
      setFollowLoading(false)
    }
  }, [currentUserId, profileId, isFollowing, followerCount])

  return {
    profile,
    posts,
    loading,
    message,
    setMessage,
    currentUserId,
    isOwnProfile,
    isFollowing,
    followLoading,
    followerCount,
    followingCount,
    refreshProfilePage,
    handleToggleFollow,
  }
}