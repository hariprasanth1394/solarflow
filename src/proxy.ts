import { NextRequest } from 'next/server'
import { authMiddleware } from './middleware/authMiddleware'

export function proxy(request: NextRequest) {
  return authMiddleware(request)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/customers/:path*',
    '/inventory/:path*',
    '/analytics/:path*',
    '/estimator/:path*',
    '/tasks/:path*',
    '/documents/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/notifications/:path*'
  ]
}
