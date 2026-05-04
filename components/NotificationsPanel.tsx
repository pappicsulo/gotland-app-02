// ===== NotificationsPanel.tsx =====

'use client'

import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase/client'

type Notification = {
  id: string
  type: 'like' | 'comment' | 'follow'
  from_user_id: string
  to_user_id: string
  post_id: string | null
  created_at: string
  profiles: {
    username: string
  } | null
}

type Props = {
  userId: string | null
  open: boolean
  onClose: () => void
  onOpenPost: (postId: string) => void
  onOpenProfile: (profileId: string) => void
}

export default function NotificationsPanel({
  userId,
  open,
  onClose,
  onOpenPost,
  onOpenProfile,
}: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !userId) return

    async function loadNotifications() {
      setLoading(true)

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          type,
          from_user_id,
          to_user_id,
          post_id,
          created_at,
          profiles:profiles!notifications_from_user_id_fkey (
            username
          )
        `)
        .eq('to_user_id', userId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setNotifications(data as unknown as Notification[])
      }

      setLoading(false)
    }

    void loadNotifications()
  }, [open, userId])

  if (!open) return null

  function renderText(n: Notification) {
    const username = n.profiles?.username || 'Someone'

    if (n.type === 'like') return `${username} liked your post`
    if (n.type === 'comment') return `${username} commented on your post`
    if (n.type === 'follow') return `${username} started following you`

    return 'New activity'
  }

  function handleNotificationClick(n: Notification) {
    if (n.type === 'follow') {
      onClose()
      onOpenProfile(n.from_user_id)
      return
    }

    if ((n.type === 'like' || n.type === 'comment') && n.post_id) {
      onClose()
      onOpenPost(n.post_id)
    }
  }

  return (
    <div className="absolute inset-0 z-50 bg-black/80 px-4 pb-4 pt-24 backdrop-blur-xl">
      <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-zinc-950 p-4 text-white">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Notifications</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-zinc-400">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-zinc-500">No notifications yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className="rounded-2xl bg-white/5 p-3 text-left text-sm transition hover:bg-white/10"
                >
                  {renderText(n)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}