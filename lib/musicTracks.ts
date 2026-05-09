// ===== musicTracks.ts =====

import { supabase } from '@/lib/supabase/client'

// =========================
// TYPES
// =========================

export type MusicTrack = {
  id: string
  title: string
  artist: string
  url: string
  start: number
  duration: number
  category?: string
}

type MusicTrackRow = {
  id: string
  title: string
  artist: string
  category: string | null
  public_url: string
  preview_start: number | null
  preview_duration: number | null
}

// =========================
// DATA
// =========================

export async function getMusicTracks(): Promise<MusicTrack[]> {
  const { data, error } = await supabase
    .from('music_tracks')
    .select(
      `
      id,
      title,
      artist,
      category,
      public_url,
      preview_start,
      preview_duration
    `
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return ((data ?? []) as MusicTrackRow[]).map((track) => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    category: track.category ?? 'general',
    url: track.public_url,
    start: track.preview_start ?? 0,
    duration: track.preview_duration ?? 12,
  }))
}

// =========================
// TEMPORARY LEGACY FALLBACK
// =========================
// Behålls tillfälligt så gamla importer inte kraschar.
// I nästa steg kopplar vi MusicPickerPanel till getMusicTracks().

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'track-1',
    title: 'Blues Ballad',
    artist: 'Alec Koff',
    url: '/music/alec-blues.mp3',
    start: 5,
    duration: 10,
  },
  {
    id: 'track-2',
    title: 'Music Promotion',
    artist: 'Miromax',
    url: '/music/miromax-promo.mp3',
    start: 0,
    duration: 12,
  },
  {
    id: 'track-3',
    title: 'Stomp Drums',
    artist: 'EnergySound',
    url: '/music/energy-drums.mp3',
    start: 2,
    duration: 10,
  },
  {
    id: 'track-4',
    title: 'Playful Night',
    artist: 'Alex Zavesa',
    url: '/music/alex-dance.mp3',
    start: 3,
    duration: 10,
  },
]