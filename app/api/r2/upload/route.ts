import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: Request) {
  try {
    if (
      !process.env.R2_ENDPOINT ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !process.env.R2_BUCKET ||
      !process.env.R2_PUBLIC_URL
    ) {
      return NextResponse.json(
        { error: 'Missing R2 environment variables.' },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const userId = formData.get('userId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID.' }, { status: 400 })
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Only video files are allowed.' },
        { status: 400 }
      )
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4'
    const fileName = `${userId}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`

    const buffer = Buffer.from(await file.arrayBuffer())

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      })
    )

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('R2 upload error:', error)

    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
}