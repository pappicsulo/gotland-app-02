'use client'

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpegInstance: FFmpeg | null = null
let ffmpegLoadPromise: Promise<FFmpeg> | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance

  if (!ffmpegLoadPromise) {
    ffmpegLoadPromise = (async () => {
      const ffmpeg = new FFmpeg()

      const baseURL =
        'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd'

      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.js`,
          'text/javascript'
        ),
        wasmURL: await toBlobURL(
          `${baseURL}/ffmpeg-core.wasm`,
          'application/wasm'
        ),
      })

      ffmpegInstance = ffmpeg
      return ffmpeg
    })()
  }

  return ffmpegLoadPromise
}

async function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
    }

    video.preload = 'metadata'
    video.src = objectUrl
    video.muted = true
    video.playsInline = true

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      cleanup()
      resolve(duration)
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('Could not read video duration.'))
    }
  })
}

export async function compressVideo(file: File): Promise<File> {
  const ffmpeg = await getFFmpeg()

  const inputExtension =
    file.name.split('.').pop()?.toLowerCase() ||
    (file.type === 'video/quicktime'
      ? 'mov'
      : file.type === 'video/webm'
      ? 'webm'
      : 'mp4')

  const inputName = `input.${inputExtension}`
  const outputName = 'output.mp4'

  const duration = await readVideoDuration(file)

  let crf = 26
  if (duration > 0 && duration <= 10) {
    crf = 24
  } else if (duration > 10 && duration <= 20) {
    crf = 26
  } else if (duration > 20) {
    crf = 28
  }

  await ffmpeg.writeFile(inputName, await fetchFile(file))

  await ffmpeg.exec([
    '-i',
    inputName,
    '-vf',
    'scale=720:-2',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    String(crf),
    '-movflags',
    '+faststart',
    '-an',
    outputName,
  ])

  const data = await ffmpeg.readFile(outputName)

  if (!(data instanceof Uint8Array)) {
    throw new Error('Compressed video could not be read.')
  }

  const outputBytes = new Uint8Array(data)

  const blob = new Blob([outputBytes], {
    type: 'video/mp4',
  })

  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.mp4`, {
    type: 'video/mp4',
    lastModified: Date.now(),
  })
}

export async function generateVideoThumbnail(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = objectUrl
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('Could not load video metadata.'))
    })

    const targetTime =
      video.duration && Number.isFinite(video.duration)
        ? Math.min(1, Math.max(video.duration * 0.2, 0.1))
        : 0.1

    await new Promise<void>((resolve, reject) => {
      const handleSeeked = () => {
        video.removeEventListener('seeked', handleSeeked)
        resolve()
      }

      video.addEventListener('seeked', handleSeeked, { once: true })

      try {
        video.currentTime = targetTime
      } catch {
        reject(new Error('Could not seek video for thumbnail.'))
      }

      video.onerror = () => reject(new Error('Could not seek video.'))
    })

    const width = video.videoWidth || 720
    const height = video.videoHeight || 1280

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not create thumbnail canvas.')
    }

    ctx.drawImage(video, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    })

    if (!blob) {
      throw new Error('Could not export thumbnail image.')
    }

    return new File([blob], 'thumbnail.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}