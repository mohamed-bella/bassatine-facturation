-- Channel Manager Tables
-- 1. Reservations
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source TEXT NOT NULL, -- 'airbnb', 'booking', 'expedia', 'direct'
    source_booking_id TEXT,
    guest_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    room_number TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'pending'
    number_of_guests INTEGER DEFAULT 1,
    price DECIMAL(15,2),
    currency TEXT DEFAULT 'MAD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(source, source_booking_id)
);

-- 2. Blocked Dates
CREATE TABLE IF NOT EXISTS public.blocked_dates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    reason TEXT DEFAULT 'owner_block', -- 'maintenance', 'cleaning', 'owner_block'
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. iCal Exports Metadata
CREATE TABLE IF NOT EXISTS public.ical_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source TEXT NOT NULL,
    last_generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    feed_url TEXT
);

-- RLS Policies
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ical_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access" ON public.reservations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON public.blocked_dates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Full access" ON public.ical_exports FOR ALL USING (true) WITH CHECK (true);
