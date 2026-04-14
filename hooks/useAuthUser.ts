'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase/client'
import { ensureUserProfile } from '@/lib/profiles'

type UseAuthUserReturn = {
  user: User | null
  authLoading: boolean
}

export function useAuthUser(): UseAuthUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        await ensureUserProfile(currentUser)
      }

      setAuthLoading(false)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        await ensureUserProfile(currentUser)
      }

      setAuthLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    authLoading,
  }
}