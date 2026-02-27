// Input validation utilities
export const validateDepositAmount = (amount: string): { valid: boolean; error?: string } => {
  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { valid: false, error: 'Please enter a valid number' };
  }
  
  if (numAmount < 100) {
    return { valid: false, error: 'Minimum deposit is $100 USDC' };
  }
  
  if (numAmount > 1000000) {
    return { valid: false, error: 'Maximum deposit is $1,000,000 USDC' };
  }
  
  if (!Number.isInteger(numAmount)) {
    return { valid: false, error: 'Please enter a whole number (no decimals)' };
  }
  
  return { valid: true };
};

export const validateWalletAddress = (address: string): { valid: boolean; error?: string } => {
  if (!address || address.trim() === '') {
    return { valid: false, error: 'Wallet address is required' };
  }
  
  // Basic Solana address validation (base58, 32-44 chars)
  if (address.length < 32 || address.length > 44) {
    return { valid: false, error: 'Invalid wallet address length' };
  }
  
  // Check if valid base58
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  if (!base58Regex.test(address)) {
    return { valid: false, error: 'Invalid wallet address format' };
  }
  
  return { valid: true };
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>'"]/g, '');
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatTimeLeft = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};
