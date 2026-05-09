import { supabase } from '@/lib/supabase/client'
import {
  isProtectedDisplayName,
  isProtectedUsername,
} from '@/lib/protectedNames'

export async function updateProfile(params: {
  userId: string
  username: string
  fullName: string
  bio: string
  avatarUrl?: string | null
}) {
  const username = params.username.trim().toLowerCase()
  const fullName = params.fullName.trim()

  if (isProtectedUsername(username)) {
    throw new Error('This username is not allowed.')
  }

  if (fullName && isProtectedDisplayName(fullName)) {
    throw new Error('This display name is not allowed.')
  }

  const updateData: {
    username: string
    full_name: string | null
    bio: string | null
    avatar_url?: string | null
  } = {
    username,
    full_name: fullName || null,
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