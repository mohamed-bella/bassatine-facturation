import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);

  const from = searchParams.get('from') || new Date().toISOString().split('T')[0];
  const to = searchParams.get('to') || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
  const source = searchParams.get('source');
  const status = searchParams.get('status');
  const room_id = searchParams.get('room_id');

  let query = supabase
    .from('reservations')
    .select('*')
    .gte('check_out_date', from)
    .lte('check_in_date', to)
    .order('check_in_date', { ascending: true });

  if (source) query = query.eq('source', source);
  if (status) query = query.eq('status', status);
  if (room_id) query = query.eq('room_id', room_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const body = await req.json();

  const { guest_name, email, phone, check_in_date, check_out_date, room_number, room_id, number_of_guests, price, notes } = body;

  if (!guest_name || !check_in_date || !check_out_date) {
    return NextResponse.json({ error: 'guest_name, check_in_date, check_out_date are required' }, { status: 400 });
  }

  const { data, error } = await supabase.from('reservations').insert({
    source: 'direct',
    source_booking_id: `direct-${Date.now()}`,
    guest_name,
    email,
    phone,
    check_in_date,
    check_out_date,
    room_number,
    room_id,
    number_of_guests: number_of_guests || 1,
    price,
    currency: 'MAD',
    status: 'confirmed',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

