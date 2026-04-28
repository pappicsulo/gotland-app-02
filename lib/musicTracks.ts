// ===== musicTracks.ts =====

export type MusicTrack = {
  id: string
  title: string
  artist: string
  url: string
  start: number
  duration: number
}

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