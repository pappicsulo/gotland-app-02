// ===== profile.ts =====

import { supabase } from '@/lib/supabase/client'

export async function updateProfile(params: {
  userId: string
  username: string
  fullName: string
  bio: string
  avatarUrl?: string | null
}) {
  const username = params.username.trim().toLowerCase()

  const updateData: {
    username: string
    full_name: string | null
    bio: string | null
    avatar_url?: string | null
  } = {
    username,
    full_name: params.fullName.trim() || null,
    bio: params.bio.trim() || null,
  }

  if (params.avatarUrl !== undefined) {
    updateData.avatar_url = params.avatarUrl
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', params.userId)
    .select('id, username, full_name, bio, avatar_url')
    .single()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      'Profile update did not save. Supabase RLS may be blocking this user.'
    )
  }

  return data
}

export async function uploadAvatarImage(userId: string, file: File) {
  const fileExt = file.name.split('.').pop() || 'jpg'
  const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

  return data.publicUrl
}