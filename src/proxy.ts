import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This will refresh the session if it's expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // SENSITIVE ROUTE PROTECTION
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  const isSensitivePage = (
    request.nextUrl.pathname.startsWith('/backup') ||
    request.nextUrl.pathname.startsWith('/catalog') ||
    request.nextUrl.pathname.startsWith('/clients') ||
    request.nextUrl.pathname.startsWith('/facture-commerciale') ||
    request.nextUrl.pathname.startsWith('/channel-manager')
  )

  if (!user && (isApiRoute || isSensitivePage)) {
    // If it's an API route, return JSON error
    if (isApiRoute) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // If it's a regular page, redirect to HOME (where the login UI is handled by AuthGuard)
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
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
