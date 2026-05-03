import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select(`
      *,
      room_sync_configs (*)
    `)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(rooms);
}

export async function POST(req: Request) {
  try {
    const { action, ...payload } = await req.json();

    if (action === 'create_room') {
      const { data, error } = await supabase
        .from('rooms')
        .insert([{
          name: payload.name,
          room_type_id: payload.room_type_id,
          color: payload.color || '#10b981',
          sort_order: payload.sort_order || 0
        }])
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (action === 'save_sync_config') {
      const { data, error } = await supabase
        .from('room_sync_configs')
        .upsert({
          room_id: payload.room_id,
          source: payload.source,
          ical_url: payload.ical_url,
          last_sync_status: 'pending'
        }, {
          onConflict: 'room_id,source'
        })
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (action === 'delete_room') {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', payload.id);
      
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
