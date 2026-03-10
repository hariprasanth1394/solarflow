"use client"

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useAuth from '../../hooks/useAuth'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (event) => {
    event.preventDefault()
    const { error: loginError } = await signIn(email, password)

    if (loginError) {
      setMessage(loginError.message)
      return
    }

    const redirectTo = searchParams.get('redirect') || '/dashboard'
    setMessage(`Login successful${rememberMe ? ' (remember me enabled)' : ''}`)
    router.replace(redirectTo)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-500">Login to access your SaaS workspace.</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-violet-600"
              />
              Remember Me
            </label>
            <button type="button" className="text-sm font-medium text-violet-600 hover:text-violet-700">
              Forgot Password
            </button>
          </div>
        </div>

        {(error || message) && (
          <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">{error?.message || message}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}
