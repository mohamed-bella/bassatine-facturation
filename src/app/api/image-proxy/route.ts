import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  }

  const urlParam = request.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  // ALLOWLIST SECURITY CHECK
  const ALLOWED_HOSTS = ['bassatine-skoura.com', 'mohamedbella.com'];
  let parsed: URL;
  
  try {
    parsed = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: 'Host not permitted (SSRF protection)' }, { status: 403 });
  }

  if (parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'HTTPS only' }, { status: 400 });
  }

  try {
    const res = await fetch(urlParam, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Bassatine-PDF-Generator/1.0)',
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch image: ${res.status}` }, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    
    // Safety check for content type
    if (!contentType.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image content is allowed' }, { status: 400 });
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return NextResponse.json({ base64, contentType });
  } catch (err: any) {
    console.error('Image Proxy Error:', err);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
