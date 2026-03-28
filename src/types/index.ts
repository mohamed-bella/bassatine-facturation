// === Status Unions ===
export type ProformaStatus = 'brouillon' | 'envoyé' | 'accepté' | 'refusé';
export type InvoiceStatus = 'brouillon' | 'envoyée' | 'partiellement_payée' | 'payée' | 'en_retard';
export type PaymentType = 'especes' | 'carte' | 'virement';
export type TvaMode = 'ht' | 'ttc';
export type CatalogCategory = 'chambre' | 'service' | 'taxe' | 'autre';

// === Line Item (embedded in documents) ===
export interface LineItem {
  description: string;
  quantity: number;       // nb_chambres (number of rooms)
  nb_clients?: number;    // number of clients/persons
  unit_price: number;
  subtotal: number;       // quantity × unit_price, rounded to 2 decimals
}

// === Product Catalog ===
export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  default_price: number;
  category: CatalogCategory;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// === Client (Partenaire) ===
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address_street?: string;
  address_city?: string;
  address_country?: string;
  company_ice?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// === Proforma ===
export interface Proforma {
  id: string;
  proforma_number: string;
  client_id?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  status: ProformaStatus;
  items_json: LineItem[];
  tva_mode: TvaMode;
  subtotal_ht: number;
  tva_amount: number;
  total_ttc: number;
  notes?: string;
  linked_invoice_id?: string;
  // Manual / Legacy fields
  amount_words?: string;
  recipient_name?: string;
  recipient_ice?: string;
  recipient_address?: string;
  recipient_email?: string;
  // Joined fields (not in DB)
  client?: Client;
}

// === Invoice (Facture) ===
export interface Invoice {
  id: string;
  invoice_number: string;
  client_id?: string;
  proforma_id?: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  status: InvoiceStatus;
  items_json: LineItem[];
  tva_mode: TvaMode;
  subtotal_ht: number;
  tva_amount: number;
  total_ttc: number;
  amount_words?: string;
  notes?: string;
  // Manual / Legacy fields
  recipient_name?: string;
  recipient_ice?: string;
  recipient_address?: string;
  recipient_email?: string;
  // Joined / computed fields (not stored)
  client?: Client;
  payments?: Payment[];
  amount_paid?: number;
  amount_due?: number;
}

// === Payment (Paiement) ===
export interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string;
  amount: number;
  type: PaymentType;
  payment_date: string;
  notes?: string;
  is_cancelled: boolean;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  // Joined fields
  invoice?: Invoice;
}

// === Settings ===
export interface Settings {
  id: string;
  logo_url?: string;
  stamp_url?: string;
  company_name: string;
  company_sub_name?: string;
  company_email?: string;
  company_address?: string;
  company_phone?: string;
  company_ice?: string;
  company_rc?: string;
  company_tp?: string;
  company_if?: string;
  company_cnss?: string;
}
