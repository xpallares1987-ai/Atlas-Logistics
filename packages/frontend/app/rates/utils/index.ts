import { CurrencyType } from '../types';

// Format currency output nicely
export const formatCurrencySymbol = (type: CurrencyType): string => {
  switch (type) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'CNY': return '¥';
    default: return '$';
  }
};

// Check rate expiry relative to the current date
export const getExpiryStatus = (validToString: string) => {
  if (!validToString) return { isSoon: false, isExpired: false, daysLeft: 0 };
  const expiryDate = new Date(validToString);
  const today = new Date();
  // Set timing to midnight for correct date-level comparison
  expiryDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    isSoon: diffDays >= 0 && diffDays <= 15,
    isExpired: diffDays < 0,
    daysLeft: diffDays
  };
};
