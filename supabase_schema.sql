-- Enhanced Tables for Bassatine Invoice Manager v2.0 (Next.js & Supabase)

-- 1. Invoices Table (Enhanced)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    due_date DATE, -- Added for professional tracking
    invoice_type TEXT NOT NULL DEFAULT 'commercial', -- 'commercial', 'proforma'
    invoice_status TEXT DEFAULT 'draft' NOT NULL, -- 'draft', 'sent', 'paid', 'overdue', 'cancelled'
    is_trashed BOOLEAN DEFAULT false NOT NULL,
    
    -- Recipient Details
    recipient_name TEXT NOT NULL,
    recipient_ice TEXT NOT NULL,
    recipient_email TEXT,
    recipient_phone TEXT, -- Added
    recipient_address TEXT, -- Added
    
    -- Financials
    items_json JSONB NOT NULL, -- Array of items: {desc: string, qty: number, price: number, tax: number, discount: number}
    subtotal_ht DECIMAL(15,2) NOT NULL,
    tax_total DECIMAL(15,2) DEFAULT 0 NOT NULL, -- More granular
    grand_total_ttc DECIMAL(15,2) NOT NULL,
    amount_words TEXT NOT NULL,
    currency TEXT DEFAULT 'DH' NOT NULL, -- Added for future flexibility
    
    -- Internal tracking
    notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Clients Table (New - for professional management)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    ice TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Settings Table (Global Config)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY, -- 'global'
    logo_url TEXT,
    company_name TEXT DEFAULT 'BOUMHCHAD SARL AU',
    company_details TEXT,
    company_address TEXT,
    company_ice TEXT,
    email_subject TEXT DEFAULT 'Votre facture de Bassatine Skoura',
    email_template TEXT DEFAULT 'Bonjour {client_name},\n\nVeuillez trouver ci-joint votre facture N° {invoice_number}.\n\nCordialement,\nL''équipe Bassatine Skoura',
    default_tax_rate DECIMAL(5,2) DEFAULT 10.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Audit Logs (New)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES public.invoices(id),
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'sent', 'paid'
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed Settings
INSERT INTO public.settings (id, logo_url, company_name, company_details)
VALUES ('global', 
        'https://bassatine-skoura.com/wp-content/uploads/2025/01/Green-Cream-Palm-Beach-Club-Logo-240-x-80-px.png', 
        'BOUMHCHAD SARL AU', 
        'Douar Boumhchad Skoura – Ouarzazate – GMS : 06 61 70 99 20\nRC : 7755/Ouarzazate • T.P : 47165021 • IF : 25287521 • CNSS : 1093803 • ICE : 002092692000010'
) ON CONFLICT (id) DO NOTHING;

-- Policies (Simplified for dev, should be tightened later)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full access" ON public.invoices;
CREATE POLICY "Full access" ON public.invoices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON public.clients;
CREATE POLICY "Full access" ON public.clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON public.settings;
CREATE POLICY "Full access" ON public.settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access" ON public.audit_logs;
CREATE POLICY "Full access" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
