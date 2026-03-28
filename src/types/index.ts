export type InvoiceType = 'commercial' | 'proforma';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  desc: string;
  qty: number;
  price: number;
  tax: number; // Percent (e.g., 10, 20)
  discount: number; // Percent (e.g., 0, 5, 10)
  clients: string; // Additional reference (e.g., "Chambre 101, Mr. Smith")
}

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  invoice_type: InvoiceType;
  invoice_status: InvoiceStatus;
  is_trashed: boolean;
  
  // Recipient Details
  recipient_name: string;
  recipient_ice: string;
  recipient_email?: string;
  recipient_phone?: string;
  recipient_address?: string;
  
  // Financials
  items_json: InvoiceItem[];
  subtotal_ht: number;
  tax_total: number;
  grand_total_ttc: number;
  amount_words: string;
  currency: string;
  
  // Internal
  notes?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  ice?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export interface Settings {
  id: string;
  logo_url: string;
  company_name: string;
  company_details: string;
  company_address?: string;
  company_ice?: string;
  email_subject: string;
  email_template: string;
  default_tax_rate: number;
}

export interface AuditLog {
  id: string;
  invoice_id: string;
  action: string;
  metadata?: any;
  created_at: string;
}
