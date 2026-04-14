'use client'

import type { ReactNode } from 'react'

type MobileShellProps = {
  children: ReactNode
}

export default function MobileShell({ children }: MobileShellProps) {
  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto h-screen w-full max-w-[430px] overflow-hidden bg-black md:px-2 md:py-3">
        <div className="h-full w-full overflow-hidden bg-black md:rounded-[32px] md:ring-1 md:ring-white/10">
          {children}
        </div>
      </div>
    </div>
  )
}