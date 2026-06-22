"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { denyUnprovisionedSession, validateProvisionedAccess } from "@/services/userProvisionService"

const ACCESS_COOKIE = "sb-access-token"

function setAccessCookie(token: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${ACCESS_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`
}

function AuthCallbackFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-violet-500" />
        <p className="text-sm text-slate-600 dark:text-slate-300">Verifying your SolarFlow access…</p>
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

      const { data, error } = await supabase.auth.getSession()
      if (!active) return

      if (error || !data.session) {
        router.replace("/login?error=Authentication%20failed.%20Please%20try%20again.")
        return
      }

      if (data.session.access_token) {
        setAccessCookie(data.session.access_token)
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
