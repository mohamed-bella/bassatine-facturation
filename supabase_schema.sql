-- Bassatine Facturation v3.0 — Complete Schema
-- Tables: clients, product_catalog, proformas, invoices, payments, settings

-- 1. Clients (Partenaires)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company_ice TEXT,
    address_street TEXT,
    address_city TEXT,
    address_country TEXT DEFAULT 'Maroc',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Product Catalog (Catalogue de Prestations)
CREATE TABLE IF NOT EXISTS public.product_catalog (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    default_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    category TEXT NOT NULL DEFAULT 'autre', -- 'chambre', 'service', 'taxe', 'autre'
    is_active BOOLEAN DEFAULT true NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CLEANUP & MIGRATION FOR DUPLICATES
-- 1. Remove duplicates keeping only one version per name
DELETE FROM public.product_catalog 
WHERE id NOT IN (
    SELECT MIN(id::text)::uuid 
    FROM public.product_catalog 
    GROUP BY name
);

-- 2. Add unique constraint to prevent future duplicates if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_catalog_name_key') THEN
        ALTER TABLE public.product_catalog ADD CONSTRAINT product_catalog_name_key UNIQUE (name);
    END IF;
END $$;

-- 3. Proformas
CREATE TABLE IF NOT EXISTS public.proformas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proforma_number TEXT NOT NULL UNIQUE, -- DEV-001
    client_id UUID REFERENCES public.clients(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at DATE,
    status TEXT NOT NULL DEFAULT 'brouillon', -- 'brouillon', 'envoyé', 'accepté', 'refusé'

    -- Line items embedded as JSONB array
    -- Each: { description: string, quantity: number, unit_price: number, subtotal: number }
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Financials
    tva_mode TEXT NOT NULL DEFAULT 'ht', -- 'ht' or 'ttc'
    subtotal_ht DECIMAL(15,2) NOT NULL DEFAULT 0,
    tva_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_ttc DECIMAL(15,2) NOT NULL DEFAULT 0,

    notes TEXT,

    -- Link to generated invoice (1-to-1)
    linked_invoice_id UUID
);

-- 4. Invoices (Factures)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE, -- INV-001
    client_id UUID REFERENCES public.clients(id),
    proforma_id UUID REFERENCES public.proformas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'brouillon', -- 'brouillon', 'envoyée', 'partiellement_payée', 'payée', 'en_retard'

    -- Line items embedded as JSONB
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Financials
    tva_mode TEXT NOT NULL DEFAULT 'ht',
    subtotal_ht DECIMAL(15,2) NOT NULL DEFAULT 0,
    tva_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_ttc DECIMAL(15,2) NOT NULL DEFAULT 0,

    amount_words TEXT,
    notes TEXT
);

-- 5. Payments (Paiements)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_number TEXT NOT NULL UNIQUE, -- PAY-001
    invoice_id UUID NOT NULL REFERENCES public.invoices(id),
    amount DECIMAL(15,2) NOT NULL,
    type TEXT NOT NULL DEFAULT 'especes', -- 'especes', 'carte', 'virement'
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    is_cancelled BOOLEAN DEFAULT false NOT NULL,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Settings (Configuration Globale)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY, -- 'global'
    logo_url TEXT,
    stamp_url TEXT,
    company_name TEXT DEFAULT 'BOUMHCHAD SARL AU',
    company_sub_name TEXT DEFAULT 'BASSATINE SKOURA',
    company_email TEXT DEFAULT 'contact@bassatine-skoura.com',
    company_address TEXT DEFAULT 'Douar Boumhchad Skoura – Ouarzazate',
    company_phone TEXT DEFAULT '06 23 34 99 51 – 06 61 70 99 20',
    company_ice TEXT DEFAULT '002092692000010',
    company_rc TEXT DEFAULT '7755/Ouarzazate',
    company_tp TEXT DEFAULT '47165021',
    company_if TEXT DEFAULT '25287521',
    company_cnss TEXT DEFAULT '1093803',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- For users who already have the table (migrations):
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS stamp_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS company_sub_name TEXT DEFAULT 'BASSATINE SKOURA';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS company_email TEXT DEFAULT 'contact@bassatine-skoura.com';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS company_phone TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS company_address TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS company_ice TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS company_rc TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS company_tp TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS company_if TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS company_cnss TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company_ice TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address_country TEXT DEFAULT 'Maroc';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Proformas
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS proforma_number TEXT;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS items_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS tva_mode TEXT DEFAULT 'ht';
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS subtotal_ht DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS tva_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS total_ttc DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'brouillon';
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS expires_at DATE;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS amount_words TEXT;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS recipient_ice TEXT;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS recipient_address TEXT;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE public.proformas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS proforma_id UUID REFERENCES public.proformas(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS items_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tva_mode TEXT DEFAULT 'ht';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS subtotal_ht DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tva_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total_ttc DECIMAL(15,2) DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS amount_words TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'brouillon';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- LEGACY COLUMNS (to satisfy existing constraints or frontend fallbacks)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS recipient_ice TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS recipient_address TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_date DATE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'commercial';

-- ============================================================
-- NUCLEAR CLEANUP: Make ALL non-essential legacy columns nullable
-- This handles any old NOT NULL columns from prior schema versions
-- (e.g. invoice_date, invoice_type, recipient_name, recipient_ice,
--  recipient_address, recipient_email, recipient_city, etc.)
-- ============================================================
DO $$
DECLARE
    r RECORD;
    -- Columns we intentionally want to KEEP as NOT NULL
    essential_cols TEXT[] := ARRAY[
        'id', 'created_at',
        'invoice_number',  -- must exist to be unique
        'proforma_number'  -- must exist to be unique
    ];
BEGIN
    -- Loop over every NOT NULL column in invoices that is NOT in our essentials list
    FOR r IN
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
          AND is_nullable = 'NO'
          AND column_name != ALL(essential_cols)
    LOOP
        EXECUTE format('ALTER TABLE public.invoices ALTER COLUMN %I DROP NOT NULL', r.column_name);
    END LOOP;

    -- Loop over every NOT NULL column in proformas that is NOT in our essentials list
    FOR r IN
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'proformas'
          AND is_nullable = 'NO'
          AND column_name != ALL(essential_cols)
    LOOP
        EXECUTE format('ALTER TABLE public.proformas ALTER COLUMN %I DROP NOT NULL', r.column_name);
    END LOOP;

    -- Loop over every NOT NULL column in clients that is NOT in our essentials list  
    FOR r IN
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'clients'
          AND is_nullable = 'NO'
          AND column_name != ALL(ARRAY['id', 'name', 'created_at'])
    LOOP
        EXECUTE format('ALTER TABLE public.clients ALTER COLUMN %I DROP NOT NULL', r.column_name);
    END LOOP;
END $$;

-- Seed Settings
INSERT INTO public.settings (
    id, logo_url, stamp_url, company_name, company_sub_name,
    company_email, company_address, company_phone, company_ice,
    company_rc, company_tp, company_if, company_cnss
) VALUES (
    'global',
    'https://bassatine-skoura.com/wp-content/uploads/2025/01/Green-Cream-Palm-Beach-Club-Logo-240-x-80-px.png',
    NULL,
    'BOUMHCHAD SARL AU',
    'BASSATINE SKOURA',
    'contact@bassatine-skoura.com',
    'Douar Boumhchad Skoura – Ouarzazate',
    '06 23 34 99 51 – 06 61 70 99 20',
    '002092692000010',
    '7755/Ouarzazate',
    '47165021',
    '25287521',
    '1093803'
) ON CONFLICT (id) DO UPDATE SET 
    company_sub_name = EXCLUDED.company_sub_name,
    company_email = EXCLUDED.company_email,
    company_phone = EXCLUDED.company_phone,
    company_rc = EXCLUDED.company_rc,
    company_tp = EXCLUDED.company_tp,
    company_if = EXCLUDED.company_if,
    company_cnss = EXCLUDED.company_cnss;

-- Seed Catalog with default items
INSERT INTO public.product_catalog (name, description, default_price, category, sort_order) VALUES
  ('Chambre Double', 'Chambre double standard', 850.00, 'chambre', 1),
  ('Chambre Suite', 'Suite premium avec vue', 1500.00, 'chambre', 2),
  ('Chambre Triple', 'Chambre triple familiale', 1100.00, 'chambre', 3),
  ('Taxe de Séjour', 'Taxe de séjour par personne/nuit', 25.00, 'taxe', 10),
  ('Petit-déjeuner', 'Petit-déjeuner buffet', 120.00, 'service', 20),
  ('Dîner', 'Dîner complet', 200.00, 'service', 21),
  ('Transfert Aéroport', 'Transfert aller-retour aéroport', 400.00, 'service', 30)
ON CONFLICT (name) DO UPDATE SET 
  default_price = EXCLUDED.default_price,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- RLS Policies (dev mode — full access)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proformas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full access" ON public.clients;
CREATE POLICY "Full access" ON public.clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON public.product_catalog;
CREATE POLICY "Full access" ON public.product_catalog FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON public.proformas;
CREATE POLICY "Full access" ON public.proformas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON public.invoices;
CREATE POLICY "Full access" ON public.invoices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON public.payments;
CREATE POLICY "Full access" ON public.payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON public.settings;
CREATE POLICY "Full access" ON public.settings FOR ALL USING (true) WITH CHECK (true);
