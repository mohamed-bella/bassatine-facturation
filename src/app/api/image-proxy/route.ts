import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/app/actions/auth-actions';

export async function GET(request: NextRequest) {
  const isAuthenticated = await getSession();
  if (!isAuthenticated) {
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
