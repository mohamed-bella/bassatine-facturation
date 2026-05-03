import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const isAuthenticated = request.cookies.get('auth_session')?.value === 'authenticated';

  // SENSITIVE ROUTE PROTECTION
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  const isSensitivePage = (
    request.nextUrl.pathname.startsWith('/backup') ||
    request.nextUrl.pathname.startsWith('/catalog') ||
    request.nextUrl.pathname.startsWith('/clients') ||
    request.nextUrl.pathname.startsWith('/facture-commerciale') ||
    request.nextUrl.pathname.startsWith('/channel-manager')
  )

  if (!isAuthenticated && (isApiRoute || isSensitivePage)) {
    // If it's an API route, return JSON error
    if (isApiRoute) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // If it's a regular page, redirect to HOME (where the login UI is handled by AuthGuard)
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
