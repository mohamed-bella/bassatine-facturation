import { createClient } from '@supabase/supabase-js';
import ical from 'ical.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function syncRooms() {
  console.log('[SYNC] Starting per-room iCal sync process...');
  const results = [];

  // 1. Fetch all room sync configurations
  const { data: configs, error: configError } = await supabase
    .from('room_sync_configs')
    .select('*, rooms(name)');

  if (configError) {
    console.error('[SYNC] Failed to fetch sync configurations:', configError);
    return [{ status: 'error', error: configError.message }];
  }

  if (!configs || configs.length === 0) {
    console.log('[SYNC] No room sync configurations found.');
    return [];
  }

  for (const config of configs) {
    const { room_id, source, ical_url, rooms } = config;
    const roomName = (rooms as any)?.name || 'Unknown Room';

    try {
      console.log(`[SYNC] Fetching ${source} feed for ${roomName}...`);
      
      const response = await fetch(ical_url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const icalData = await response.text();

      const jcalData = ical.parse(icalData);
      const vcalendar = new ical.Component(jcalData);
      const vevents = vcalendar.getAllSubcomponents('vevent');

      console.log(`[SYNC] Found ${vevents.length} events in ${source} feed for ${roomName}`);

      const reservationsToUpsert = [];

      for (const vevent of vevents) {
        const event = new ical.Event(vevent);
        
        // Extract basic info
        const sourceBookingId = event.uid;
        const summary = event.summary || 'Booked';
        const checkIn = event.startDate.toJSDate();
        const checkOut = event.endDate.toJSDate();
        const rawStatus = vevent.getFirstPropertyValue('status');
        const status = (rawStatus ? rawStatus.toString().toLowerCase() : '') === 'cancelled' 
          ? 'cancelled' 
          : 'confirmed';

        reservationsToUpsert.push({
          room_id,
          source,
          source_booking_id: sourceBookingId,
          guest_name: summary,
          check_in_date: checkIn.toISOString().split('T')[0],
          check_out_date: checkOut.toISOString().split('T')[0],
          status,
          updated_at: new Date().toISOString(),
        });
      }

      // Batch upsert into Supabase
      if (reservationsToUpsert.length > 0) {
        const { error } = await supabase
          .from('reservations')
          .upsert(reservationsToUpsert, {
            onConflict: 'source,source_booking_id'
          });

        if (error) {
          console.error(`[SYNC] Error batch upserting reservations for ${roomName}:`, error);
        }
      }
      
      // Update config status
      await supabase
        .from('room_sync_configs')
        .update({ 
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'success' 
        })
        .eq('id', config.id);

      results.push({ roomName, source, status: 'success', count: vevents.length });
    } catch (error: any) {
      console.error(`[SYNC] Failed to sync ${source} for ${roomName}:`, error);
      
      await supabase
        .from('room_sync_configs')
        .update({ 
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'error' 
        })
        .eq('id', config.id);

      results.push({ roomName, source, status: 'error', error: error.message });
    }
  }

  return results;
}

