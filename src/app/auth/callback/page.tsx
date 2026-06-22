"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabaseClient"
import { denyUnprovisionedSession, validateProvisionedAccess } from "@/services/userProvisionService"

const ACCESS_COOKIE = "sb-access-token"

function setAccessCookie(token: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${ACCESS_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`
}

function AuthCallbackFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--sf-bg)]">
      <div className="sf-page-busy-state" role="status" aria-live="polite" aria-busy="true">
        <div className="sf-modal-busy-spinner" aria-hidden="true" />
        <p className="sf-modal-busy-message">Signing in...</p>
      </div>
    </div>
  )
}

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    let active = true

    const finish = async () => {
      const redirectTo = searchParams.get("redirect")
      const safeRedirect = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard"

      const code = searchParams.get("code")
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (!active) return
        if (exchangeError) {
          router.replace("/login?error=Authentication%20failed.%20Please%20try%20again.")
          return
        }
      }

      let session = (await supabase.auth.getSession()).data.session
      if (!session) {
        session = await new Promise<Session | null>((resolve) => {
          const timeout = window.setTimeout(() => resolve(null), 4000)
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (nextSession) {
              window.clearTimeout(timeout)
              subscription.unsubscribe()
              resolve(nextSession)
            }
          })
        })
      }

      if (!active) return

      if (!session) {
        router.replace("/login?error=Authentication%20failed.%20Please%20try%20again.")
        return
      }

      if (session.access_token) {
        setAccessCookie(session.access_token)
      }

      const validation = await validateProvisionedAccess("google")
      if (!validation.allowed) {
        await denyUnprovisionedSession("google", validation.reason)
        router.replace(`/login?error=${encodeURIComponent(validation.message)}`)
        return
      }

      router.replace(safeRedirect)
    }

    void finish()

    return () => {
      active = false
    }
  }, [router, searchParams])

  return <AuthCallbackFallback />
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackContent />
    </Suspense>
  )
}
