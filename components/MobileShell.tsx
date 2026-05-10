// ===== MobileShell.tsx =====

'use client'

import type { ReactNode } from 'react'

type MobileShellProps = {
  children: ReactNode
}

export default function MobileShell({ children }: MobileShellProps) {
  return (
    <div className="min-h-[100svh] overflow-hidden bg-black">
      <div className="mx-auto h-[100svh] w-full max-w-[430px] overflow-hidden bg-black md:max-w-[520px] md:px-4 md:py-6 lg:max-w-[600px]">
        <div className="h-full w-full overflow-hidden bg-black md:rounded-[32px] md:ring-1 md:ring-white/10">
          {children}
        </div>
      </div>
    </div>
  )
}