'use client'

// =========================
// IMPORTS
// =========================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

// =========================
// TYPES
// =========================

type UseIsAdminReturn = {
  isAdmin: boolean
  loading: boolean
}

// =========================
// HOOK
// =========================

export function useIsAdmin(): UseIsAdminReturn {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function checkAdmin() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          if (isMounted) {
            setIsAdmin(false)
            setLoading(false)
          }
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          console.error('Admin check failed:', error)
          if (isMounted) {
            setIsAdmin(false)
            setLoading(false)
          }
          return
        }

        if (isMounted) {
          setIsAdmin(!!data?.is_admin)
          setLoading(false)
        }
      } catch (error) {
        console.error('Admin check error:', error)

        if (isMounted) {
          setIsAdmin(false)
          setLoading(false)
        }
      }
    }

    void checkAdmin()

    return () => {
      isMounted = false
    }
  }, [])

  return {
    isAdmin,
    loading,
  }
}