'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const ACCESS_COOKIE = 'sb-access-token'
const DEFAULT_TIMEOUT_MS = 45 * 60 * 1000
const MIN_TIMEOUT_MS = 30 * 60 * 1000
const MAX_TIMEOUT_MS = 60 * 60 * 1000
const protectedRoutePrefixes = [
  '/dashboard',
  '/customers',
  '/inventory',
  '/analytics',
  '/estimator',
  '/tasks',
  '/documents',
  '/reports',
  '/settings',
  '/notifications'
]

function setAccessCookie(token: string) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${ACCESS_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`
}

function clearAccessCookie() {
  document.cookie = `${ACCESS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}

export default function AuthSessionSync() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    let hasActiveSession = false
    let sessionDeadlineMs = Date.now() + DEFAULT_TIMEOUT_MS

    const isProtectedPath = protectedRoutePrefixes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

    const getTimeoutMs = () => {
      const raw = Number(localStorage.getItem('solarflow.sessionTimeoutMs') || DEFAULT_TIMEOUT_MS)
      if (Number.isNaN(raw)) return DEFAULT_TIMEOUT_MS
      return Math.min(Math.max(raw, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS)
    }

    const refreshDeadline = () => {
      sessionDeadlineMs = Date.now() + getTimeoutMs()
    }

    const redirectToLoginIfProtected = () => {
      if (!isProtectedPath) return
      const redirectPath = pathname && pathname !== '/' ? `?redirect=${encodeURIComponent(pathname)}` : ''
      router.replace(`/login${redirectPath}`)
    }

    const syncCurrentSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      const accessToken = data.session?.access_token
      if (accessToken) {
        hasActiveSession = true
        refreshDeadline()
        setAccessCookie(accessToken)
      } else {
        hasActiveSession = false
        clearAccessCookie()
        redirectToLoginIfProtected()
      }
    }

    syncCurrentSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const accessToken = session?.access_token
      if (accessToken) {
        hasActiveSession = true
        refreshDeadline()
        setAccessCookie(accessToken)
      } else {
        hasActiveSession = false
        clearAccessCookie()
        redirectToLoginIfProtected()
      }
    })

    const activityEvents: Array<keyof WindowEventMap> = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart']
    const onUserActivity = () => {
      if (!hasActiveSession) return
      refreshDeadline()
    }

    activityEvents.forEach((eventName) => window.addEventListener(eventName, onUserActivity, { passive: true }))

    const sessionMonitorId = window.setInterval(async () => {
      if (!hasActiveSession) return
      if (Date.now() < sessionDeadlineMs) return

      await supabase.auth.signOut()
      hasActiveSession = false
      clearAccessCookie()
      redirectToLoginIfProtected()
    }, 30 * 1000)

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
      window.clearInterval(sessionMonitorId)
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, onUserActivity))
    }
  }, [pathname, router])

  return null
}
