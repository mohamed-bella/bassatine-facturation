import { generateMasterIcal } from '@/lib/channel-manager/ical-generator';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    
    // Validate roomId is UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(roomId)) {
      return new Response('Invalid Room ID', { status: 400 });
    }

    const icsContent = await generateMasterIcal(roomId);

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="room-${roomId}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[ICAL_FEED] Error generating room feed:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
