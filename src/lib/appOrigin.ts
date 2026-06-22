/**
 * Resolve the app origin for OAuth redirects.
 * In the browser, always uses the current origin (production or localhost).
 * On the server, uses NEXT_PUBLIC_APP_URL or Vercel host when configured.
 */
export function getAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
  if (configured) return configured

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`
  }

  return "http://localhost:3000"
}

export function getAuthCallbackUrl(redirectPath = "/dashboard"): string {
  const safePath = redirectPath.startsWith("/") ? redirectPath : "/dashboard"
  return `${getAppOrigin()}/auth/callback?redirect=${encodeURIComponent(safePath)}`
}
