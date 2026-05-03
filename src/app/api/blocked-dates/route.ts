import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const room_id = searchParams.get('room_id');

  let query = supabase
    .from('blocked_dates')
    .select('*')
    .order('date', { ascending: true });

  if (room_id) query = query.eq('room_id', room_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();
  const { dates, reason, created_by, room_id } = body;

  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: '`dates` array is required' }, { status: 400 });
  }

  const rows = dates.map((date: string) => ({
    date,
    room_id,
    reason: reason || 'owner_block',
    created_by: created_by || 'admin',
  }));

  const { data, error } = await supabase
    .from('blocked_dates')
    .upsert(rows, { onConflict: 'room_id,date' })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const room_id = searchParams.get('room_id');

  if (!date) return NextResponse.json({ error: '`date` query param is required' }, { status: 400 });

  let query = supabase
    .from('blocked_dates')
    .delete()
    .eq('date', date);
  
  if (room_id) query = query.eq('room_id', room_id);

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

