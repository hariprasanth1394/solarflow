import { NextRequest, NextResponse } from 'next/server'

const protectedRoutes = [
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

export function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

  if (!isProtected) {
    return NextResponse.next()
  }

  const hasAccessToken = request.cookies.has('sb-access-token')
  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => /^sb-.*-auth-token(?:\.\d+)?$/i.test(name))

  if (!hasAccessToken && !hasSupabaseAuthCookie) {
    const loginUrl = new URL('/login', request.url)
    const redirectPath = `${pathname}${request.nextUrl.search}`
    loginUrl.searchParams.set('redirect', redirectPath)
    console.log('authMiddleware redirecting unauthenticated request', redirectPath)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}
