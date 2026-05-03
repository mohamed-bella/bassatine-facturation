import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const room_id = searchParams.get('room_id');
    
    const tzString = new Date().toLocaleString("en-US", {timeZone: process.env.HOTEL_TIMEZONE || "Africa/Casablanca"});
    const today = new Date(tzString).toISOString().split('T')[0];

    // Fetch Arrivals (Check-in is today, status is confirmed)
    let arrivalsQuery = supabase
      .from('reservations')
      .select('*')
      .eq('check_in_date', today)
      .eq('status', 'confirmed');

    if (room_id) arrivalsQuery = arrivalsQuery.eq('room_id', room_id);
    const { data: arrivals, error: arrivalsError } = await arrivalsQuery;

    if (arrivalsError) throw arrivalsError;

    // Fetch Departures (Check-out is today, status is confirmed)
    let departuresQuery = supabase
      .from('reservations')
      .select('*')
      .eq('check_out_date', today)
      .eq('status', 'confirmed');

    if (room_id) departuresQuery = departuresQuery.eq('room_id', room_id);
    const { data: departures, error: departuresError } = await departuresQuery;

    if (departuresError) throw departuresError;

    return NextResponse.json({
      date: today,
      arrivals: arrivals || [],
      departures: departures || [],
    });
  } catch (error: any) {
    console.error('[API] Error fetching today dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}

