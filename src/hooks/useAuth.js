'use client'

import { useEffect, useState } from 'react'
import { login } from '../services/authService'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(false)
  }, [])

  const signIn = async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const data = await login(email, password)
      setUser(data.user)
      return { data, error: null }
    } catch (err) {
      setError(err)
      return { error: err }
    } finally {
      setLoading(false)
    }
  }

  return { user, signIn, loading, error }
}

export default useAuth