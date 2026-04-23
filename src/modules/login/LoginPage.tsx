"use client"

import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import { getCurrentSession, login, loginWithGoogle } from "../../services/authService"

const SLIDE_INTERVAL_MS = 5000

const slides = [
  {
    title: "Smart Inventory Management for Solar Teams",
    subtitle: "Track stock levels, manage components, and prevent shortages with real-time visibility.",
    image: "/assets/auth/inventory.jpg"
  },
  {
    title: "Manage Customers & Projects in One Place",
    subtitle: "Stay on top of customer data and project history without switching tools.",
    image: "/assets/auth/customers.jpg"
  },
  {
    title: "Complete Control Over Your Solar Systems",
    subtitle: "Configure, monitor, and optimize all systems from a single dashboard.",
    image: "/assets/auth/systems.jpg"
  }
] as const

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.6-2.5C16.8 3.5 14.6 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12S6.9 21.3 12 21.3c6.9 0 9.2-4.8 9.2-7.2 0-.5 0-.9-.1-1.3H12z" fill="#4285F4" />
      <path d="M3.8 7.5l3.2 2.4C7.8 8.1 9.7 6.8 12 6.8c1.9 0 3.2.8 3.9 1.5l2.6-2.5C16.8 3.5 14.6 2.7 12 2.7c-3.9 0-7.3 2.2-8.9 5.4z" fill="#34A853" />
      <path d="M12 21.3c2.5 0 4.7-.8 6.2-2.3l-2.9-2.4c-.8.6-1.9 1.1-3.3 1.1-3.9 0-5.3-2.6-5.6-3.9L3.2 16.3c1.6 3.1 4.9 5 8.8 5z" fill="#FBBC05" />
      <path d="M21.2 14.1c.1-.4.1-.8.1-1.3 0-.4 0-.8-.1-1.2H12v3.9h5.5c-.3 1-1 2.3-2.2 3.2l2.9 2.4c1.7-1.6 3-3.9 3-7z" fill="#EA4335" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [slideIndex, setSlideIndex] = useState(0)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const isLoading = submitting || googleLoading
  const redirectTo = useMemo(() => {
    const candidate = searchParams.get("redirect")
    if (!candidate || !candidate.startsWith("/")) return "/dashboard"
    return candidate
  }, [searchParams])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    let active = true

    const checkSession = async () => {
      try {
        const session = await getCurrentSession()
        if (!active) return
        if (session?.user) {
          router.replace(redirectTo)
          return
        }
      } finally {
        if (active) setCheckingSession(false)
      }
    }

    void checkSession()

    return () => {
      active = false
    }
  }, [mounted, redirectTo, router])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % slides.length)
    }, SLIDE_INTERVAL_MS)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  const currentSlide = useMemo(() => slides[slideIndex], [slideIndex])

  const persistSessionPreference = (remember: boolean) => {
    if (typeof window === "undefined") return
    const timeoutMs = remember ? 60 * 60 * 1000 : 45 * 60 * 1000
    localStorage.setItem("solarflow.rememberMe", remember ? "true" : "false")
    localStorage.setItem("solarflow.sessionTimeoutMs", String(timeoutMs))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isLoading) return

    setErrorMessage("")
    setSubmitting(true)

    try {
      persistSessionPreference(rememberMe)
      await login(email.trim(), password)
      router.replace(redirectTo)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in. Please try again")
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (isLoading) return

    setErrorMessage("")
    setGoogleLoading(true)

    try {
      persistSessionPreference(rememberMe)
      const oauthRedirectTo = `${window.location.origin}${redirectTo}`
      await loginWithGoogle(oauthRedirectTo)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Google sign-in is unavailable right now")
      setGoogleLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div
      style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
      className={`min-h-screen bg-[#F0F2F5] transition-opacity duration-500 ${mounted ? "opacity-100" : "opacity-0"} md:grid md:grid-cols-[60%_40%]`}
    >
      <section className="relative hidden min-h-screen overflow-hidden md:block">
        {slides.map((slide, index) => (
          <Image
            key={slide.title}
            src={slide.image}
            alt={slide.title}
            fill
            priority={index === 0}
            className={`object-cover transition-opacity duration-1000 ${index === slideIndex ? "opacity-100" : "opacity-0"}`}
          />
        ))}
        {/* Strong left-to-right gradient for text readability */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(8,12,24,0.92) 0%, rgba(8,12,24,0.70) 50%, rgba(8,12,24,0.15) 100%)" }}
        />

        <div className="relative z-10 h-full text-white">
          {/* Logo — top-left */}
          <div className="absolute left-10 top-8 flex items-center gap-3">
            <Image src="/assets/solarflow-app-icon.svg" alt="Solar Flow" width={32} height={32} className="h-8 w-8" />
            <span className="text-[15px] font-semibold tracking-wide">Solar Flow</span>
          </div>

          {/* Slide content — vertically centered, left-aligned */}
          <div className="flex h-full items-center px-12">
            <div className="max-w-[520px]">
              {/* Eyebrow badge */}
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[12px] font-medium tracking-wide text-white/90">Solar Flow Platform</span>
              </div>

              <h2 className="mb-5 text-[40px] font-semibold leading-[1.15] tracking-[-0.025em] text-white">
                {currentSlide.title}
              </h2>
              <p className="mb-10 text-[16px] font-normal leading-[1.65] text-white/70">
                {currentSlide.subtitle}
              </p>

              {/* Glassmorphism feature card */}
              <div className="rounded-2xl border border-white/[0.12] bg-white/[0.08] px-6 py-5 backdrop-blur-md">
                <div className="grid grid-cols-3 divide-x divide-white/[0.12]">
                  <div className="pr-6">
                    <p className="text-[22px] font-bold text-white">500+</p>
                    <p className="mt-0.5 text-[12px] font-normal text-white/55">Solar Teams</p>
                  </div>
                  <div className="px-6">
                    <p className="text-[22px] font-bold text-white">Real-time</p>
                    <p className="mt-0.5 text-[12px] font-normal text-white/55">Inventory</p>
                  </div>
                  <div className="pl-6">
                    <p className="text-[22px] font-bold text-white">99.9%</p>
                    <p className="mt-0.5 text-[12px] font-normal text-white/55">Uptime</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dot indicators — bottom-left */}
          <div className="absolute bottom-8 left-10 flex items-center gap-[7px]">
            {slides.map((slide, index) => (
              <button
                key={slide.title}
                type="button"
                onClick={() => setSlideIndex(index)}
                className={`h-[4px] rounded-full transition-all duration-300 ${
                  index === slideIndex ? "w-7 bg-white" : "w-[4px] bg-white/40 hover:bg-white/65"
                }`}
                aria-label={`View slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[#F0F2F5] px-4 py-8 sm:px-6 md:px-6 md:py-10">
        <div className="w-full max-w-[400px] rounded-[10px] bg-white px-5 py-7 shadow-[0_2px_8px_rgba(15,23,42,0.08),0_1px_3px_rgba(15,23,42,0.05)]">
          <div className="mb-6 flex flex-col items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 shadow-[0_3px_10px_rgba(37,99,235,0.30)]">
              <Image src="/assets/solarflow-icon-light.svg" alt="Solar Flow logo" width={24} height={24} className="h-6 w-6" />
            </div>
            <div className="space-y-1 text-center">
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">Welcome back</h1>
              <p className="text-[13px] font-normal text-slate-500">Sign in to your account</p>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleSignIn}
            className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-[6px] border border-slate-200 bg-white text-[13px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_2px_6px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="my-4 flex items-center gap-3 text-[10px] font-medium uppercase tracking-wider text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            <span>Or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-[12px] font-medium text-slate-600">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  autoFocus
                  required
                  className="h-11 w-full rounded-[6px] border border-slate-200 bg-[#F8FAFC] py-2 pl-9 pr-3 text-[14px] text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 hover:border-slate-300"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-[12px] font-medium text-slate-600">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  className="h-11 w-full rounded-[6px] border border-slate-200 bg-[#F8FAFC] py-2 pl-9 pr-10 text-[14px] text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 hover:border-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1">
              <label className="inline-flex items-center gap-2 text-[12px] text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Remember me
              </label>
              <a href="mailto:support@solarflow.app" className="text-[12px] font-medium text-blue-600 transition hover:text-blue-700 hover:underline">
                Forgot?
              </a>
            </div>

            {errorMessage ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-[linear-gradient(135deg,#0F172A_0%,#1E3A8A_100%)] text-[14px] font-semibold text-white shadow-[0_2px_6px_rgba(15,23,42,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(15,23,42,0.35)] active:translate-y-0 active:shadow-[0_1px_4px_rgba(15,23,42,0.15)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-5 flex items-center justify-center gap-1 text-[11px] text-slate-400">
            <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Secured with encryption
          </p>
        </div>
      </section>
    </div>
  )
}
