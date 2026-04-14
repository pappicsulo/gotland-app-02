'use client'

import type { User } from '@supabase/supabase-js'

type TopBarProps = {
  user: User | null
  showCreatePanel: boolean
  onToggleCreatePanel: () => void
  onLogout: () => void
  onGoogleLogin: () => void
  onEmailLogin: () => void
  email: string
  onEmailChange: (value: string) => void
}

export default function TopBar({
  user,
  showCreatePanel,
  onToggleCreatePanel,
  onLogout,
  onGoogleLogin,
  onEmailLogin,
  email,
  onEmailChange,
}: TopBarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/80 via-black/30 to-transparent px-4 pb-8 pt-5">
      <div className="pointer-events-auto flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">
            Gotland App
          </p>
          <h1 className="mt-1 text-2xl font-bold">For You</h1>
        </div>

        {user ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleCreatePanel}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm backdrop-blur"
            >
              {showCreatePanel ? 'Close' : 'Post'}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm backdrop-blur"
            >
              Log out
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
                className="w-[150px] rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-zinc-400 outline-none backdrop-blur"
              />

              <button
                type="button"
                onClick={onEmailLogin}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
              >
                Email
              </button>
            </div>

            <button
              type="button"
              onClick={onGoogleLogin}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
            >
              Continue with Google
            </button>
          </div>
        )}
      </div>
    </div>
  )
}