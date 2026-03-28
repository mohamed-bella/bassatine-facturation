'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Invoice } from '@/types';
import InvoiceBuilder from '@/components/InvoiceBuilder';
import { Loader2 } from 'lucide-react';

export default function EditInvoicePage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching invoice:', error);
      } else {
        setInvoice(data);
      }
      setLoading(false);
    };

    if (id) fetchInvoice();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (!invoice) return <div>Document non trouvé.</div>;

  return <InvoiceBuilder initialData={invoice} isEdit={true} />;
}
