'use client'

import { useCallback, useEffect, useState } from 'react'

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

    setLoading(true)
    setMessage('')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const signedInUserId = user?.id ?? null
    setCurrentUserId(signedInUserId)
    setIsOwnProfile(signedInUserId === profileId)

    // 🔥 UPDATED: include bio
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .eq('id', profileId)
      .maybeSingle()

    if (profileError) {
      console.error(profileError)
      setMessage('Could not load profile.')
      setLoading(false)
      return
    }

    setProfile(profileData as ProfileData)

    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        image_url,
        caption,
        created_at,
        user_id,
        profiles:profiles!posts_user_id_fkey (
          username,
          avatar_url
        )
      `)
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })

    if (postError) {
      console.error(postError)
      setMessage('Could not load user posts.')
      setLoading(false)
      return
    }

    setPosts((postData ?? []) as unknown as Post[])

    const followers = await getFollowerCount(profileId)
    const following = await getFollowingCount(profileId)

    setFollowerCount(followers)
    setFollowingCount(following)

    if (signedInUserId && signedInUserId !== profileId) {
      const followingState = await isFollowingUser(signedInUserId, profileId)
      setIsFollowing(followingState)
    } else {
      setIsFollowing(false)
    }

    setLoading(false)
  }, [profileId])

  useEffect(() => {
    refreshProfilePage()
  }, [refreshProfilePage])

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