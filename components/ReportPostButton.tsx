'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'

import { createReport, type ReportReason } from '@/lib/reports'

type ReportPostButtonProps = {
  user: User | null
  postId: string
  reportedUserId: string | null
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'violence', label: 'Violence' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'other', label: 'Other' },
]

export default function ReportPostButton({
  user,
  postId,
  reportedUserId,
}: ReportPostButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<ReportReason>('spam')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    if (!user) {
      setMessage('You must be signed in to report.')
      return
    }

    setLoading(true)

    try {
      await createReport({
        reporterId: user.id,
        reportedUserId,
        postId,
        reason,
        details,
      })

      setMessage('Report submitted. Thank you.')
      setDetails('')

      window.setTimeout(() => {
        setOpen(false)
        setMessage('')
      }, 1200)
    } catch (error: any) {
      console.error(error)
      setMessage(error?.message || 'Could not submit report.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          setMessage('')
        }}
        className="text-white/70 transition hover:text-white"
      >
        Report
      </button>

      {open && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 px-4">
          <form
            onSubmit={handleSubmitReport}
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-5 text-white shadow-2xl"
          >
            <h3 className="text-lg font-semibold">Report post</h3>

            <p className="mt-2 text-sm text-zinc-400">
              Tell us why this post should be reviewed.
            </p>

            <label className="mt-4 block text-sm text-zinc-300">Reason</label>

            <select
              value={reason}
              disabled={loading}
              onChange={(e) => setReason(e.target.value as ReportReason)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none disabled:opacity-50"
            >
              {REPORT_REASONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-sm text-zinc-300">
              Details optional
            </label>

            <textarea
              value={details}
              disabled={loading}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={300}
              rows={4}
              placeholder="Add more context..."
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 disabled:opacity-50"
            />

            <p className="mt-1 text-right text-xs text-zinc-500">
              {details.length}/300
            </p>

            {message && (
              <p className="mt-3 text-sm text-zinc-300">{message}</p>
            )}

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="rounded-full px-4 py-2 text-sm text-zinc-400 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Submit report'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}