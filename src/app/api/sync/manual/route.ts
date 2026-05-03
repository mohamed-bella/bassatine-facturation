import { NextResponse } from 'next/server';
import { syncRooms } from '@/lib/channel-manager/sync-engine';

export async function POST() {
  try {
    const results = await syncRooms();
    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (error: any) {
    console.error('[API] Manual sync failed:', error);
    return NextResponse.json({ error: 'Manual sync failed', details: error.message }, { status: 500 });
  }
}
