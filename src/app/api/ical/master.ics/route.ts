import { NextResponse } from 'next/server';
import { generateMasterIcal } from '@/lib/channel-manager/ical-generator';

// Disable caching for this route so OTA's always get the latest feed
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const icalContent = await generateMasterIcal();

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="master.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('[API] Error generating master iCal:', error);
    return NextResponse.json({ error: 'Failed to generate iCal feed' }, { status: 500 });
  }
}
