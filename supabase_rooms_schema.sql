-- 1. Create Rooms table (Physical Inventory)
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL, -- e.g., "Chambre 1", "Suite Panorama"
    room_type_id UUID REFERENCES public.product_catalog(id),
    color TEXT DEFAULT '#10b981', -- For UI differentiation
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Room Sync Configs (OTA Links)
CREATE TABLE IF NOT EXISTS public.room_sync_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    source TEXT NOT NULL, -- 'airbnb', 'booking', 'expedia'
    ical_url TEXT NOT NULL,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_sync_status TEXT, -- 'success', 'error'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, source)
);

-- 3. Update Reservations to link to Rooms
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id);

-- 4. Update Blocked Dates to link to Rooms
ALTER TABLE public.blocked_dates ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id);

-- 5. Fix unique constraint for blocked_dates (now unique per room, not globally)
ALTER TABLE public.blocked_dates DROP CONSTRAINT IF EXISTS blocked_dates_date_key;
ALTER TABLE public.blocked_dates ADD CONSTRAINT blocked_dates_room_date_key UNIQUE (room_id, date);

-- 6. Data Migration (Optional: Link existing reservations to a first default room if needed)
-- This depends on user's existing data, but for safety we leave it nullable.

-- 7. RLS Policies
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_sync_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access" ON public.rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON public.room_sync_configs FOR ALL USING (true) WITH CHECK (true);

-- 7. Seed Initial Rooms (Optional - based on catalog)
INSERT INTO public.rooms (name, room_type_id)
SELECT name, id FROM public.product_catalog WHERE category = 'chambre'
ON CONFLICT DO NOTHING;
