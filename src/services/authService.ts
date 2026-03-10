import { supabase } from "../lib/supabaseClient"
import { logError, logInfo } from "../utils/logger"

const ACCESS_COOKIE = "sb-access-token"

function setAccessCookie(token: string) {
  if (typeof document === "undefined") return
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${ACCESS_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}`
}

function clearAccessCookie() {
  if (typeof document === "undefined") return
  document.cookie = `${ACCESS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
}

export async function signUp(email: string, password: string, name: string) {
  if (!email?.trim() || !password?.trim() || !name?.trim()) {
    throw new Error("Operation failed")
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    })

    if (error) throw error

    logInfo("Auth sign-up completed", { service: "authService", email })
    return data
  } catch (error) {
    logError("Auth sign-up failed", error, { service: "authService", email })
    throw new Error("Operation failed")
  }
}

export async function login(email: string, password: string) {
  if (!email?.trim() || !password?.trim()) {
    throw new Error("Operation failed")
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    if (data.session?.access_token) {
      setAccessCookie(data.session.access_token)
    }

    logInfo("Auth login completed", { service: "authService", email })
    return data
  } catch (error) {
    logError("Auth login failed", error, { service: "authService", email })
    throw new Error("Operation failed")
  }
}

export async function logout() {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) throw error

    clearAccessCookie()
    logInfo("Auth logout completed", { service: "authService" })
  } catch (error) {
    logError("Auth logout failed", error, { service: "authService" })
    throw new Error("Operation failed")
  }
}