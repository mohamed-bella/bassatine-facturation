'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useMemo } from 'react';
import { Invoice } from '@/types';
import { format, subMonths, eachMonthOfInterval, startOfMonth, isSameMonth } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

interface Props {
  invoices: Invoice[];
}

export default function RevenueChart({ invoices }: Props) {
  const chartData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    const labels = months.map(m => format(m, 'MMM'));
    const data = months.map(month => {
      const monthInvoices = invoices.filter(inv => 
        !inv.is_trashed && 
        inv.invoice_type === 'commercial' &&
        isSameMonth(new Date(inv.invoice_date), month)
      );
      return monthInvoices.reduce((acc, inv) => acc + Number(inv.grand_total_ttc), 0);
    });

    return {
      labels,
      datasets: [
        {
          fill: true,
          label: 'Revenue (DH)',
          data,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.05)',
          tension: 0.5,
          pointRadius: 6,
          pointBackgroundColor: '#f97316',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 4,
          pointHoverRadius: 8,
          pointHoverBorderWidth: 4,
        },
      ],
    };
  }, [invoices]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12, weight: 'bold' as any, family: 'Inter' },
        bodyFont: { size: 14, weight: '900' as any, family: 'Inter' },
        padding: 16,
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.parsed.y.toLocaleString('fr-MA')} DH`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10, weight: '900' as any, family: 'Inter' }, color: '#cbd5e1' },
      },
      y: {
        grid: { color: 'rgba(15, 23, 42, 0.02)', drawTicks: false },
        ticks: { font: { size: 10, weight: '700' as any, family: 'Inter' }, color: '#94a3b8', padding: 8 },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="h-full w-full">
      <Line data={chartData} options={options} />
    </div>
  );
}
