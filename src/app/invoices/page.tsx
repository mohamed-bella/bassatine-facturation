'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Invoice } from '@/types';
import InvoiceList from '@/components/InvoiceList';
import { Loader2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('is_trashed', false)
      .order('created_at', { ascending: false });
    
    setInvoices(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTrash = async (id: string) => {
    await supabase.from('invoices').update({ is_trashed: true }).eq('id', id);
    fetchData();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Synchronisation Archive...</span>
    </div>
  );

  return (
    <div className="px-10 pb-20">
      <div className="flex items-center space-x-4 mb-2">
         <div className="w-6 h-1 bg-orange-600 rounded-full"></div>
         <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Operational Records</span>
      </div>
      <motion.h1 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-black tracking-tighter text-slate-900 uppercase mb-16"
      >
        Document Registry
      </motion.h1>
      
      <InvoiceList 
        invoices={invoices} 
        onTrash={handleTrash}
        onRestore={() => {}}
        onDelete={() => {}}
      />
    </div>
  );
}
