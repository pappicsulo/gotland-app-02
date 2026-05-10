// ===== TopBar.tsx =====

'use client'

// =========================
// IMPORTS
// =========================

import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

import {
  Bell,
  LogOut,
  Plus,
  Search,
  User as UserIcon,
  X,
} from 'lucide-react'

// =========================
// TYPES
// =========================

type TopBarProps = {
  onToggleNotificationsPanel: () => void
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

// =========================
// COMPONENT
// =========================

export default function TopBar({
  user,
  showCreatePanel,
  onToggleCreatePanel,
  onToggleSearchPanel,
  onToggleNotificationsPanel,
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

  // =========================
  // HANDLERS
  // =========================

  function handleOpenMyProfile() {
    if (!user?.id) return
    router.push(`/profile/${user.id}`)
  }

  function handleSearchClick() {
    onToggleSearchPanel()
  }

  // =========================
  // COMMON ICON BUTTON STYLE
  // =========================

  const iconButtonClass =
    'flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-50'

  // =========================
  // RENDER
  // =========================

  return (
    <div className="pointer-events-none absolute left-2 right-2 top-0 z-30 bg-gradient-to-b from-black/55 via-black/20 to-transparent px-4 pb-6 pt-4">
      <div className="pointer-events-auto flex items-start justify-between gap-3">
        {/* LEFT SIDE */}
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">
            gotly
          </p>

          <h1 className="mt-1 text-2xl font-bold">For You</h1>
        </div>

        {/* RIGHT SIDE */}
        {user ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* PROFILE */}
            <button
              type="button"
              onClick={handleOpenMyProfile}
              disabled={disableTopActions}
              className={iconButtonClass}
              aria-label="Profile"
            >
              <UserIcon size={18} strokeWidth={2.2} />
            </button>

            {/* SEARCH */}
            <button
              type="button"
              onClick={handleSearchClick}
              disabled={disableTopActions}
              className={iconButtonClass}
              aria-label="Search"
            >
              <Search size={18} strokeWidth={2.2} />
            </button>

            {/* NOTIFICATIONS */}
            <button
              type="button"
              onClick={onToggleNotificationsPanel}
              disabled={disableTopActions}
              className={iconButtonClass}
              aria-label="Notifications"
            >
              <Bell size={18} strokeWidth={2.2} />
            </button>

            {/* CREATE POST */}
            <button
              type="button"
              onClick={onToggleCreatePanel}
              disabled={disableTopActions}
              className={iconButtonClass}
              aria-label={showCreatePanel ? 'Close create panel' : 'Create post'}
            >
              {showCreatePanel ? (
                <X size={18} strokeWidth={2.2} />
              ) : (
                <Plus size={18} strokeWidth={2.2} />
              )}
            </button>

            {/* LOGOUT */}
            <button
              type="button"
              onClick={onLogout}
              disabled={disableTopActions}
              className={iconButtonClass}
              aria-label="Log out"
            >
              <LogOut size={18} strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2">
            {/* EMAIL LOGIN */}
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

            {/* GOOGLE LOGIN */}
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