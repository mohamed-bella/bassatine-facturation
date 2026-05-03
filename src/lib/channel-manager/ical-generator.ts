import { createClient } from '@supabase/supabase-js';
import ical from 'ical.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function generateMasterIcal(roomId?: string) {
  const hotelName = process.env.HOTEL_NAME || 'Bassatine Skoura';
  let feedName = `${hotelName} Master Feed`;

  // 0. Fetch room name if roomId is provided
  if (roomId) {
    const { data: room } = await supabase
      .from('rooms')
      .select('name')
      .eq('id', roomId)
      .single();
    if (room) {
      feedName = `${hotelName} - ${room.name}`;
    }
  }
  
  // 1. Fetch active reservations (filtered by room if provided)
  let resQuery = supabase
    .from('reservations')
    .select('*')
    .eq('status', 'confirmed')
    .gte('check_out_date', new Date().toISOString().split('T')[0]);

  if (roomId) {
    resQuery = resQuery.eq('room_id', roomId);
  }

  const { data: reservations } = await resQuery;

  // 2. Fetch blocked dates (filtered by room if provided)
  let blockQuery = supabase
    .from('blocked_dates')
    .select('*')
    .gte('date', new Date().toISOString().split('T')[0]);

  if (roomId) {
    blockQuery = blockQuery.eq('room_id', roomId);
  }

  const { data: blocks } = await blockQuery;

  // 3. Initialize iCal Component
  const vcalendar = new ical.Component(['vcalendar', [], []]);
  vcalendar.addPropertyWithValue('prodid', '-//Bassatine//Channel Manager//FR');
  vcalendar.addPropertyWithValue('version', '2.0');
  vcalendar.addPropertyWithValue('x-wr-calname', feedName);

  // 4. Add Reservations to feed
  reservations?.forEach(res => {
    const vevent = new ical.Component('vevent');
    const event = new ical.Event(vevent);
    
    event.uid = `res-${res.id}@bassatine.com`;
    event.summary = `Occupé - ${res.guest_name || 'Client'}`;
    
    event.startDate = ical.Time.fromJSDate(new Date(res.check_in_date), true);
    event.endDate = ical.Time.fromJSDate(new Date(res.check_out_date), true);

    vcalendar.addSubcomponent(vevent);
  });

  // 5. Add Blocks to feed
  blocks?.forEach(block => {
    const vevent = new ical.Component('vevent');
    const event = new ical.Event(vevent);
    
    event.uid = `block-${block.id}@bassatine.com`;
    event.summary = `Bloqué - ${block.reason || 'Maintenance'}`;
    
    event.startDate = ical.Time.fromJSDate(new Date(block.date), true);

    const nextDay = new Date(block.date);
    nextDay.setDate(nextDay.getDate() + 1);
    event.endDate = ical.Time.fromJSDate(nextDay, true);

    vcalendar.addSubcomponent(vevent);
  });

  return vcalendar.toString();
}

