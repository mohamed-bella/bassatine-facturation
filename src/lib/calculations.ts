import { LineItem, TvaMode, Payment } from '@/types';

const TVA_RATE = 0.10; // 10%

/**
 * Calculate the subtotal of a single line item.
 * subtotal = quantity × unit_price, rounded to 2 decimals.
 */
export function calcLineSubtotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/**
 * Calculate document totals based on TVA mode.
 * - HT mode: prices are hors taxe → total_ttc = subtotal × 1.10
 * - TTC mode: prices are toutes taxes → subtotal_ht = total / 1.10
 */
export function calcDocumentTotals(
  items: LineItem[],
  tvaMode: TvaMode
): { subtotal_ht: number; tva_amount: number; total_ttc: number } {
  const rawSum = items.reduce((acc, item) => acc + calcLineSubtotal(item.quantity, item.unit_price), 0);

  let subtotal_ht: number;
  let total_ttc: number;
  let tva_amount: number;

  if (tvaMode === 'ht') {
    subtotal_ht = Math.round(rawSum * 100) / 100;
    tva_amount = Math.round(subtotal_ht * TVA_RATE * 100) / 100;
    total_ttc = Math.round((subtotal_ht + tva_amount) * 100) / 100;
  } else {
    // TTC mode: prices entered include tax
    total_ttc = Math.round(rawSum * 100) / 100;
    subtotal_ht = Math.round((total_ttc / (1 + TVA_RATE)) * 100) / 100;
    tva_amount = Math.round((total_ttc - subtotal_ht) * 100) / 100;
  }

  return { subtotal_ht, tva_amount, total_ttc };
}

/**
 * Sum of all active (non-cancelled) payments for an invoice.
 */
export function calcAmountPaid(payments: Payment[]): number {
  return payments
    .filter(p => !p.is_cancelled)
    .reduce((acc, p) => acc + Number(p.amount), 0);
}

/**
 * Remaining amount due on an invoice.
 */
export function calcAmountDue(totalTtc: number, amountPaid: number): number {
  return Math.round((totalTtc - amountPaid) * 100) / 100;
}

/**
 * Format an amount in MAD for display.
 * Example: 1234.56 → "1 234,56"
 */
export function formatMAD(amount: number): string {
  return (amount || 0).toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Generate the next sequential number for a document.
 * Given prefix "2026" and existing ["2026/01", "2026/02"], returns "2026/03" if separator is "/".
 */
export function generateNextNumber(prefix: string, existingNumbers: string[], separator: string = '-', padding: number = 3): string {
  const maxNum = existingNumbers.reduce((max, num) => {
    // Escape separator for regex
    const escSep = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = num.match(new RegExp(`^${prefix}${escSep}(\\d+)$`));
    if (match) {
      const n = parseInt(match[1], 10);
      return n > max ? n : max;
    }
    return max;
  }, 0);

  return `${prefix}${separator}${String(maxNum + 1).padStart(padding, '0')}`;
}
