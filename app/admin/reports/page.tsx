'use client'

// =========================
// IMPORTS
// =========================

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase/client'
import { useIsAdmin } from '@/hooks/useIsAdmin'

// =========================
// TYPES
// =========================

type ReportStatus = 'pending' | 'reviewed' | 'dismissed'

type ReportType = 'post' | 'comment' | 'profile'

type ReportProfile = {
  username: string | null
}

type Report = {
  id: string
  created_at: string
  reporter_id: string
  reported_user_id: string | null
  post_id: string | null
  comment_id: string | null
  reason: string
  details: string | null
  status: ReportStatus
  reporter_profile: ReportProfile | null
  reported_profile: ReportProfile | null
}

// =========================
// HELPERS
// =========================

function getReportType(report: Report): ReportType {
  if (report.comment_id) return 'comment'
  if (report.post_id) return 'post'
  return 'profile'
}

function getStatusClasses(status: ReportStatus) {
  if (status === 'reviewed') {
    return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
  }

  if (status === 'dismissed') {
    return 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300'
  }

  return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200'
}

function getTypeClasses(type: ReportType) {
  if (type === 'comment') {
    return 'border-blue-500/20 bg-blue-500/10 text-blue-200'
  }

  if (type === 'profile') {
    return 'border-purple-500/20 bg-purple-500/10 text-purple-200'
  }

  return 'border-red-500/20 bg-red-500/10 text-red-200'
}

function formatUsername(profile: ReportProfile | null) {
  if (!profile?.username) return 'Unknown user'
  return `@${profile.username}`
}

// =========================
// PAGE
// =========================

export default function AdminReportsPage() {
  const router = useRouter()

  const { isAdmin, loading: adminLoading } = useIsAdmin()

  // =========================
  // STATE
  // =========================

  const [reports, setReports] = useState<Report[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [message, setMessage] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<
    'all' | ReportStatus
  >('all')

  // =========================
  // LOAD REPORTS
  // =========================

  useEffect(() => {
    if (adminLoading) return
    if (!isAdmin) return

    async function loadReports() {
      setLoadingReports(true)
      setMessage('')

      try {
        const { data, error } = await supabase
          .from('reports')
          .select(`
            id,
            created_at,
            reporter_id,
            reported_user_id,
            post_id,
            comment_id,
            reason,
            details,
            status,
            reporter_profile:profiles!reports_reporter_id_fkey (
              username
            ),
            reported_profile:profiles!reports_reported_user_id_fkey (
              username
            )
          `)
          .order('created_at', { ascending: false })

        if (error) {
          console.error(error)
          setMessage('Could not load reports.')
          return
        }

        setReports((data ?? []) as unknown as Report[])
      } catch (error) {
        console.error(error)
        setMessage('Something went wrong while loading reports.')
      } finally {
        setLoadingReports(false)
      }
    }

    void loadReports()
  }, [adminLoading, isAdmin])

  // =========================
  // DERIVED VALUES
  // =========================

  const filteredReports = useMemo(() => {
    if (statusFilter === 'all') return reports

    return reports.filter(
      (report) => report.status === statusFilter
    )
  }, [reports, statusFilter])

  // =========================
  // REPORT ACTIONS
  // =========================

  async function updateReportStatus(
    reportId: string,
    nextStatus: ReportStatus
  ) {
    setMessage('')
    setActionLoadingId(reportId)

    try {
      const { error } = await supabase
        .from('reports')
        .update({
          status: nextStatus,
        })
        .eq('id', reportId)

      if (error) {
        console.error(error)
        setMessage('Could not update report.')
        return
      }

      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId
            ? {
                ...report,
                status: nextStatus,
              }
            : report
        )
      )
    } catch (error) {
      console.error(error)
      setMessage('Something went wrong while updating report.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleDeleteReportedPost(report: Report) {
    if (!report.post_id) return

    const confirmed = window.confirm(
      'Delete this reported post? This cannot be undone.'
    )

    if (!confirmed) return

    setMessage('')
    setActionLoadingId(report.id)

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', report.post_id)

      if (error) {
        console.error(error)
        setMessage('Could not delete reported post.')
        return
      }

      setReports((prev) =>
        prev.map((item) =>
          item.id === report.id
            ? {
                ...item,
                status: 'reviewed',
              }
            : item
        )
      )

      setMessage('Reported post deleted.')
    } catch (error) {
      console.error(error)
      setMessage('Something went wrong while deleting the post.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleDeleteReportedComment(report: Report) {
    if (!report.comment_id) return

    const confirmed = window.confirm(
      'Delete this reported comment? This cannot be undone.'
    )

    if (!confirmed) return

    setMessage('')
    setActionLoadingId(report.id)

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', report.comment_id)

      if (error) {
        console.error(error)
        setMessage('Could not delete reported comment.')
        return
      }

      setReports((prev) =>
        prev.map((item) =>
          item.id === report.id
            ? {
                ...item,
                status: 'reviewed',
              }
            : item
        )
      )

      setMessage('Reported comment deleted.')
    } catch (error) {
      console.error(error)
      setMessage('Something went wrong while deleting the comment.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // =========================
  // NAVIGATION
  // =========================

  function openReportedProfile(userId: string | null) {
    if (!userId) return

    router.push(`/profile/${userId}`)
  }

  function openReportedPost(postId: string | null) {
    if (!postId) return

    router.push(`/post/${postId}`)
  }

  // =========================
  // ACCESS STATES
  // =========================

  if (adminLoading) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <p>Checking admin access...</p>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black p-6 text-center text-white">
        <h1 className="text-2xl font-bold">Access denied</h1>

        <p className="mt-3 max-w-sm text-sm text-zinc-400">
          You do not have permission to view this admin page.
        </p>

        <button
          type="button"
          onClick={() => router.push('/')}
          className="mt-6 rounded-full bg-white px-5 py-2 text-sm font-medium text-black"
        >
          Go back
        </button>
      </main>
    )
  }

  // =========================
  // RENDER
  // =========================

  return (
    <main className="min-h-screen bg-black p-4 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
              Admin
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Reports
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Total reports: {reports.length}
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm"
          >
            Back
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {(
            ['all', 'pending', 'reviewed', 'dismissed'] as const
          ).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`rounded-full px-4 py-2 text-sm capitalize transition ${
                statusFilter === filter
                  ? 'bg-white text-black'
                  : 'border border-white/10 bg-white/5 text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {loadingReports ? (
          <p className="text-sm text-zinc-400">
            Loading reports...
          </p>
        ) : message ? (
          <p className="mb-4 text-sm text-red-400">
            {message}
          </p>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="font-semibold">
              No matching reports
            </p>

            <p className="mt-2 text-sm text-zinc-400">
              Try another filter.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {filteredReports.map((report) => {
              const reportType = getReportType(report)
              const isUpdating = actionLoadingId === report.id

              return (
                <article
                  key={report.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950"
                >
                  <div className="border-b border-white/10 p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div
                            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getTypeClasses(
                              reportType
                            )}`}
                          >
                            {reportType}
                          </div>

                          <div
                            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusClasses(
                              report.status
                            )}`}
                          >
                            {report.status}
                          </div>
                        </div>

                        <h2 className="mt-4 text-lg font-semibold capitalize">
                          {report.reason}
                        </h2>

                        <p className="mt-2 text-sm text-zinc-400">
                          Report ID: {report.id}
                        </p>
                      </div>

                      <div className="shrink-0 text-sm text-zinc-500">
                        {new Date(
                          report.created_at
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    {report.details && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Details
                        </p>

                        <p className="text-sm leading-6 text-zinc-200">
                          {report.details}
                        </p>
                      </div>
                    )}

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Reporter
                        </p>

                        <p className="text-sm font-semibold text-zinc-100">
                          {formatUsername(report.reporter_profile)}
                        </p>

                        <p className="mt-2 break-all text-xs text-zinc-500">
                          {report.reporter_id}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Reported User
                        </p>

                        <p className="text-sm font-semibold text-zinc-100">
                          {formatUsername(report.reported_profile)}
                        </p>

                        <p className="mt-2 break-all text-xs text-zinc-500">
                          {report.reported_user_id || '-'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Post ID
                        </p>

                        <p className="break-all text-sm text-zinc-200">
                          {report.post_id || '-'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Comment ID
                        </p>

                        <p className="break-all text-sm text-zinc-200">
                          {report.comment_id || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
                      <button
                        type="button"
                        disabled={!report.reported_user_id}
                        onClick={() =>
                          openReportedProfile(report.reported_user_id)
                        }
                        className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Open reported profile
                      </button>

                      {report.post_id && (
                        <>
                          <button
                            type="button"
                            onClick={() => openReportedPost(report.post_id)}
                            className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-white"
                          >
                            Open reported post
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleDeleteReportedPost(report)}
                            className="rounded-full bg-red-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isUpdating
                              ? 'Deleting...'
                              : 'Delete reported post'}
                          </button>
                        </>
                      )}

                      {report.comment_id && (
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() =>
                            handleDeleteReportedComment(report)
                          }
                          className="rounded-full bg-red-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isUpdating
                            ? 'Deleting...'
                            : 'Delete reported comment'}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={
                          isUpdating ||
                          report.status === 'reviewed'
                        }
                        onClick={() =>
                          updateReportStatus(report.id, 'reviewed')
                        }
                        className="rounded-full bg-emerald-300 px-5 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating && report.status !== 'reviewed'
                          ? 'Updating...'
                          : 'Mark as reviewed'}
                      </button>

                      <button
                        type="button"
                        disabled={
                          isUpdating ||
                          report.status === 'dismissed'
                        }
                        onClick={() =>
                          updateReportStatus(report.id, 'dismissed')
                        }
                        className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating && report.status !== 'dismissed'
                          ? 'Updating...'
                          : 'Dismiss'}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}