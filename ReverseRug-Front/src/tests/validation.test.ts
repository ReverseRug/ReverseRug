import { describe, it, expect } from 'vitest';
import { validateDepositAmount, validateWalletAddress, sanitizeInput } from '../lib/validation';

describe('validateDepositAmount', () => {
  it('should accept valid amounts', () => {
    expect(validateDepositAmount('100').valid).toBe(true);
    expect(validateDepositAmount('10000').valid).toBe(true);
    expect(validateDepositAmount('500000').valid).toBe(true);
  });
  
  it('should reject amounts below minimum', () => {
    const result = validateDepositAmount('50');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Minimum deposit is $100');
  });
  
  it('should reject amounts above maximum', () => {
    const result = validateDepositAmount('2000000');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Maximum deposit');
  });
  
  it('should reject decimal amounts', () => {
    const result = validateDepositAmount('100.5');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('whole number');
  });
  
  it('should reject non-numeric input', () => {
    const result = validateDepositAmount('abc');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('valid number');
  });
  
  it('should reject empty input', () => {
    const result = validateDepositAmount('');
    expect(result.valid).toBe(false);
  });
});

describe('validateWalletAddress', () => {
  it('should accept valid Solana addresses', () => {
    const validAddress = 'DKgxkYsEQmVY1Sya7MGSaKVGXazLDHzk696ooMrZLd2F';
    expect(validateWalletAddress(validAddress).valid).toBe(true);
  });
  
  it('should reject too short addresses', () => {
    const result = validateWalletAddress('abc123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid wallet address length');
  });
  
  it('should reject addresses with invalid characters', () => {
    const result = validateWalletAddress('0O0O0O0O0O0O0O0O0O0O0O0O0O0O0O0O0O'); // Contains 0 and O
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid wallet address format');
  });
  
  it('should reject empty addresses', () => {
    const result = validateWalletAddress('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });
});

describe('sanitizeInput', () => {
  it('should remove dangerous characters', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
    expect(sanitizeInput('normal text')).toBe('normal text');
    expect(sanitizeInput(`test"quote'`)).toBe('testquote');
  });
  
  it('should trim whitespace', () => {
    expect(sanitizeInput('  test  ')).toBe('test');
  });
});
