// ===== audio.ts =====

let currentAudio: HTMLAudioElement | null = null
let currentKey: string | null = null
let loopInterval: ReturnType<typeof setInterval> | null = null
let fadeInterval: ReturnType<typeof setInterval> | null = null
let audioUnlocked = false
let playbackToken = 0

const FADE_MS = 280
const FADE_STEPS = 14
const MAX_VOLUME = 1

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function unlockAudio() {
  audioUnlocked = true
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlockAudio, { passive: true })
  window.addEventListener('click', unlockAudio, { passive: true })
  window.addEventListener('touchstart', unlockAudio, { passive: true })
  window.addEventListener('keydown', unlockAudio)
  window.addEventListener('wheel', unlockAudio, { passive: true })
  window.addEventListener('scroll', unlockAudio, {
    passive: true,
    capture: true,
  })
}

function clearLoop() {
  if (loopInterval) {
    clearInterval(loopInterval)
    loopInterval = null
  }
}

function clearFade() {
  if (fadeInterval) {
    clearInterval(fadeInterval)
    fadeInterval = null
  }
}

async function safePlay(audio: HTMLAudioElement) {
  if (!audioUnlocked) return

  try {
    await audio.play()
  } catch (error) {
    if (isAbortError(error)) return
    console.error('Audio play failed:', error)
  }
}

function fadeOutAndRemove(audio: HTMLAudioElement) {
  const startVolume = audio.volume
  let step = 0

  const interval = setInterval(() => {
    step += 1

    const progress = step / FADE_STEPS
    audio.volume = Math.max(0, startVolume * (1 - progress))

    if (step >= FADE_STEPS) {
      clearInterval(interval)
      audio.pause()
      audio.currentTime = 0
      audio.src = ''
    }
  }, FADE_MS / FADE_STEPS)
}

function fadeIn(audio: HTMLAudioElement) {
  clearFade()

  audio.volume = 0
  let step = 0

  fadeInterval = setInterval(() => {
    step += 1

    const progress = step / FADE_STEPS
    audio.volume = Math.min(MAX_VOLUME, MAX_VOLUME * progress)

    if (step >= FADE_STEPS) {
      clearFade()
      audio.volume = MAX_VOLUME
    }
  }, FADE_MS / FADE_STEPS)
}

export async function playAudioSegment(
  url: string,
  start: number,
  duration: number
) {
  const nextKey = `${url}-${start}-${duration}`

  if (currentKey === nextKey && currentAudio) {
    return
  }

  const token = ++playbackToken
  const previousAudio = currentAudio

  clearLoop()

  const nextAudio = new Audio(url)
  nextAudio.preload = 'auto'
  nextAudio.loop = false
  nextAudio.volume = 0

  currentAudio = nextAudio
  currentKey = nextKey

  if (previousAudio) {
    fadeOutAndRemove(previousAudio)
  }

  const startNewAudio = async () => {
    if (playbackToken !== token) return
    if (currentAudio !== nextAudio) return
    if (!audioUnlocked) return

    try {
      nextAudio.currentTime = start
    } catch {
      return
    }

    await safePlay(nextAudio)

    if (playbackToken !== token) return
    if (currentAudio !== nextAudio) return

    fadeIn(nextAudio)

    loopInterval = setInterval(() => {
      if (playbackToken !== token) return
      if (currentAudio !== nextAudio) return
      if (!audioUnlocked) return

      if (nextAudio.currentTime >= start + duration) {
        nextAudio.currentTime = start
        void safePlay(nextAudio)
      }
    }, 200)
  }

  if (nextAudio.readyState >= 1) {
    await startNewAudio()
  } else {
    nextAudio.addEventListener(
      'loadedmetadata',
      () => {
        void startNewAudio()
      },
      { once: true }
    )
  }
}

export function stopAudio() {
  playbackToken += 1
  currentKey = null

  clearLoop()
  clearFade()

  if (currentAudio) {
    const audioToStop = currentAudio
    currentAudio = null
    fadeOutAndRemove(audioToStop)
  }
}

export function hasAudioUnlocked() {
  return audioUnlocked
}