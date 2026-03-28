'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Invoice } from '@/types';
import InvoiceList from '@/components/InvoiceList';
import { Loader2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TrashPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('is_trashed', true)
      .order('created_at', { ascending: false });
    
    setInvoices(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRestore = async (id: string) => {
    await supabase.from('invoices').update({ is_trashed: false }).eq('id', id);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('DÉFINITIF ? Cette action est irréversible.')) return;
    await supabase.from('invoices').delete().eq('id', id);
    fetchData();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
    </div>
  );

  return (
    <div className="px-10 pb-20">
      <header className="mb-20">
        <div className="flex items-center space-x-4 mb-2">
           <div className="w-6 h-1 bg-rose-500 rounded-full"></div>
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Safety Buffer</span>
        </div>
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-5xl font-black tracking-tighter text-slate-900 uppercase"
        >
          Archive Management
        </motion.h1>
      </header>

      <InvoiceList 
        invoices={invoices} 
        onRestore={handleRestore}
        onDelete={handleDelete}
      />
    </div>
  );
}
