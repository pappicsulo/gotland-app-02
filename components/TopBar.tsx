// ===== TopBar.tsx =====

'use client'

import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

type TopBarProps = {
  user: User | null
  showCreatePanel: boolean
  onToggleCreatePanel: () => void
  onToggleSearchPanel: () => void
  onLogout: () => void
  onGoogleLogin: () => void
  onEmailLogin: () => void
  email: string
  onEmailChange: (value: string) => void
  authBusy?: boolean
  createBusy?: boolean
}

export default function TopBar({
  user,
  showCreatePanel,
  onToggleCreatePanel,
  onToggleSearchPanel,
  onLogout,
  onGoogleLogin,
  onEmailLogin,
  email,
  onEmailChange,
  authBusy = false,
  createBusy = false,
}: TopBarProps) {
  const router = useRouter()
  const disableTopActions = authBusy || createBusy

  function handleOpenMyProfile() {
    if (!user?.id) return
    router.push(`/profile/${user.id}`)
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/80 via-black/30 to-transparent px-4 pb-8 pt-5">
      <div className="pointer-events-auto flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">
            gotly
          </p>
          <h1 className="mt-1 text-2xl font-bold">For You</h1>
        </div>

        {user ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleOpenMyProfile}
              disabled={disableTopActions}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm backdrop-blur disabled:opacity-50"
            >
              Profile
            </button>

            <button
              type="button"
              onClick={onToggleSearchPanel}
              disabled={disableTopActions}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm backdrop-blur disabled:opacity-50"
            >
              Search
            </button>

            <button
              type="button"
              onClick={onToggleCreatePanel}
              disabled={disableTopActions}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm backdrop-blur disabled:opacity-50"
            >
              {showCreatePanel ? 'Close' : 'Post'}
            </button>

            <button
              type="button"
              onClick={onLogout}
              disabled={disableTopActions}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm backdrop-blur disabled:opacity-50"
            >
              {authBusy ? 'Logging out...' : 'Log out'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="Email"
                disabled={authBusy}
                className="w-[150px] rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-zinc-400 outline-none backdrop-blur disabled:opacity-50"
              />

              <button
                type="button"
                onClick={onEmailLogin}
                disabled={authBusy}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                {authBusy ? 'Sending...' : 'Email'}
              </button>
            </div>

            <button
              type="button"
              onClick={onGoogleLogin}
              disabled={authBusy}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {authBusy ? 'Please wait...' : 'Continue with Google'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}