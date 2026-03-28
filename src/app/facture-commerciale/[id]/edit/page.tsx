'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Invoice } from '@/types';
import InvoiceBuilder from '@/components/InvoiceBuilder';
import { Loader2 } from 'lucide-react';

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error || !data) {
        router.push('/f-commercial');
        return;
      }

      // Redirect to view if not editable
      if (data.status !== 'brouillon') {
        router.push(`/facture-commerciale/${params.id}/view`);
        return;
      }

      setInvoice(data);
      setLoading(false);
    };
    fetchInvoice();
  }, [params.id, router]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chargement...</span>
    </div>
  );

  return <InvoiceBuilder initialData={invoice!} isEdit />;
}
