'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Proforma } from '@/types';
import ProformaBuilder from '@/components/ProformaBuilder';
import { Loader2 } from 'lucide-react';

export default function EditProformaPage() {
  const params = useParams();
  const router = useRouter();
  const [proforma, setProforma] = useState<Proforma | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProforma = async () => {
      const { data, error } = await supabase
        .from('proformas')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error || !data) {
        router.push('/proformas');
        return;
      }

      // Redirect to view if not editable
      if (data.status !== 'brouillon') {
        router.push(`/proforma/${params.id}/view`);
        return;
      }

      setProforma(data);
      setLoading(false);
    };
    fetchProforma();
  }, [params.id, router]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chargement...</span>
    </div>
  );

  return <ProformaBuilder initialData={proforma!} isEdit />;
}
