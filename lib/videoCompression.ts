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

    // mobilvänlig storlek
    '-vf',
    'scale=720:-2',

    // rimlig balans mellan speed och kvalitet
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    String(crf),

    // snabbare start i web/feed
    '-movflags',
    '+faststart',

    // inget ljud i denna v1
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

  return new File(
    [blob],
    `${file.name.replace(/\.[^.]+$/, '')}.mp4`,
    {
      type: 'video/mp4',
      lastModified: Date.now(),
    }
  )
}