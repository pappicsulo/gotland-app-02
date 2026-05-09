import { supabase } from '@/lib/supabase/client'

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate'
  | 'nudity'
  | 'violence'
  | 'scam'
  | 'other'

export type CreateReportParams = {
  reporterId: string
  reportedUserId?: string | null
  postId?: string | null
  commentId?: string | null
  reason: ReportReason
  details?: string
}

export async function createReport(params: CreateReportParams) {
  const reason = params.reason
  const details = params.details?.trim() || null

  const hasTarget =
    !!params.reportedUserId || !!params.postId || !!params.commentId

  if (!params.reporterId) {
    throw new Error('You must be signed in to report.')
  }

  if (!hasTarget) {
    throw new Error('Report target is required.')
  }

  const { data, error } = await supabase
    .from('reports')
    .insert([
      {
        reporter_id: params.reporterId,
        reported_user_id: params.reportedUserId ?? null,
        post_id: params.postId ?? null,
        comment_id: params.commentId ?? null,
        reason,
        details,
      },
    ])
    .select('id, status, created_at')
    .single()

  if (error) {
    if (
      error.message.toLowerCase().includes('duplicate') ||
      error.code === '23505'
    ) {
      throw new Error('You have already reported this.')
    }

    throw error
  }

  return data
}