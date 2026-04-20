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
    let isMounted = true

    async function syncUser(sessionUser: User | null) {
      if (!isMounted) return

      setUser(sessionUser)

      if (sessionUser) {
        try {
          await ensureUserProfile(sessionUser)
        } catch (error) {
          console.error('ensureUserProfile failed:', error)
        }
      }

      if (isMounted) {
        setAuthLoading(false)
      }
    }

    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        await syncUser(session?.user ?? null)
      } catch (error) {
        console.error('Auth init failed:', error)

        if (isMounted) {
          setUser(null)
          setAuthLoading(false)
        }
      }
    }

    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user ?? null)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    authLoading,
  }
}