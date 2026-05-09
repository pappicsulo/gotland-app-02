// ===== PostMedia.tsx =====

'use client'

// =========================
// IMPORTS
// =========================

import Image from 'next/image'

// =========================
// TYPES
// =========================

type PostMediaProps = {
  mediaType: 'image' | 'video'
  imageUrl: string | null
  videoUrl: string | null
  caption: string | null
  isActive?: boolean
  shouldPreload?: boolean
  videoRef?: React.RefObject<HTMLVideoElement | null>
}

// =========================
// COMPONENT
// =========================

export default function PostMedia({
  mediaType,
  imageUrl,
  videoUrl,
  caption,
  isActive = false,
  shouldPreload = false,
  videoRef,
}: PostMediaProps) {
  const hasVideo = mediaType === 'video' && !!videoUrl
  const hasImage = mediaType === 'image' && !!imageUrl

  if (hasVideo) {
    return (
      <video
        ref={videoRef}
        src={videoUrl}
        className="h-full w-full object-cover"
        muted
        loop
        playsInline
        preload={isActive || shouldPreload ? 'auto' : 'metadata'}
      />
    )
  }

  if (hasImage) {
    return (
      <Image
        src={imageUrl}
        alt={caption || 'Post image'}
        fill
        sizes="(max-width: 430px) 100vw, 430px"
        className="object-cover"
        priority={isActive}
      />
    )
  }

  return <div className="absolute inset-0 bg-zinc-900" />
}