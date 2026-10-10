export const STAMP_URL = 'https://res.cloudinary.com/dxg2nsnkj/image/upload/v1788773073/bassatine-cache_gjowzg.png';

// Shared on every pro forma so the screen preview, browser print, and PDF use
// the exact same bank-transfer details.
export const BANK_TRANSFER_DETAILS = {
  bankName: 'Banque Populaire Centre-Sud',
  rib: '101 553 21211 11225090013 09',
  iban: 'MA64 101 553 21211 11225090013 09',
  swift: 'BCPOMAMC',
} as const;
