let audio: HTMLAudioElement | null = null
let loopInterval: ReturnType<typeof setInterval> | null = null
let playbackToken = 0
let audioUnlocked = false

function unlockAudio() {
  audioUnlocked = true
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockAudio, { once: false })
  window.addEventListener('touchstart', unlockAudio, { once: false })
  window.addEventListener('keydown', unlockAudio, { once: false })
}

export async function playAudioSegment(
  url: string,
  start: number,
  duration: number
) {
  const token = ++playbackToken

  stopAudio()

  const nextAudio = new Audio(url)
  nextAudio.preload = 'auto'
  audio = nextAudio

  const safePlay = async () => {
    if (playbackToken !== token) return
    if (!audio || audio !== nextAudio) return
    if (!audioUnlocked) return

    try {
      nextAudio.currentTime = start
    } catch {
      return
    }

    try {
      await nextAudio.play()
    } catch (error) {
      console.error('Audio play failed:', error)
    }
  }

  if (nextAudio.readyState >= 1) {
    await safePlay()
  } else {
    nextAudio.addEventListener(
      'loadedmetadata',
      () => {
        void safePlay()
      },
      { once: true }
    )
  }

  loopInterval = setInterval(() => {
    if (playbackToken !== token) return
    if (!audio || audio !== nextAudio) return
    if (!audioUnlocked) return

    if (nextAudio.currentTime >= start + duration) {
      nextAudio.currentTime = start
      nextAudio.play().catch((error) => {
        console.error('Audio replay failed:', error)
      })
    }
  }, 150)
}

export function stopAudio() {
  if (loopInterval) {
    clearInterval(loopInterval)
    loopInterval = null
  }

  if (audio) {
    audio.pause()
    audio.currentTime = 0
    audio = null
  }
}

export function hasAudioUnlocked() {
  return audioUnlocked
}