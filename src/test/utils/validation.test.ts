import { describe, it, expect } from 'vitest';
import {
  trimValue,
  isValidEmail,
  isValidPhone,
  isValidIndianPhone,
  isNonEmpty,
  isValidNumber,
  isValidFutureDate,
  isDuplicate,
} from '../../utils/adminFormValidation';

describe('Form Validation Utilities', () => {
  describe('trimValue and isNonEmpty', () => {
    it('trims leading and trailing whitespace', () => {
      expect(trimValue('  Chovique  ')).toBe('Chovique');
      expect(trimValue('')).toBe('');
    });

    it('validates non-empty strings', () => {
      expect(isNonEmpty('Valid')).toBe(true);
      expect(isNonEmpty('   ')).toBe(false);
      expect(isNonEmpty('')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('accepts valid email addresses', () => {
      expect(isValidEmail('customer@chovique.com')).toBe(true);
      expect(isValidEmail('admin.user+tag@domain.co.uk')).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@domain')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('accepts valid phone numbers', () => {
      expect(isValidPhone('9876543210')).toBe(true);
      expect(isValidPhone('+91 9876543210')).toBe(true);
      expect(isValidPhone('+1-555-123-4567')).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      expect(isValidPhone('123')).toBe(false); // too short
      expect(isValidPhone('abcdefghijk')).toBe(false);
    });
  });

  describe('isValidIndianPhone', () => {
    it('accepts valid 10-digit Indian phone numbers starting with 6, 7, 8, or 9', () => {
      expect(isValidIndianPhone('9876543210')).toBe(true);
      expect(isValidIndianPhone('8765432109')).toBe(true);
      expect(isValidIndianPhone('7654321098')).toBe(true);
      expect(isValidIndianPhone('6309880123')).toBe(true);
      expect(isValidIndianPhone('+91 9876543210')).toBe(true);
      expect(isValidIndianPhone('09876543210')).toBe(true);
      expect(isValidIndianPhone('+91-83098-54870')).toBe(true);
    });

    it('rejects invalid Indian phone numbers', () => {
      expect(isValidIndianPhone('6309880')).toBe(false); // incomplete 7 digits (from screenshot)
      expect(isValidIndianPhone('5309880123')).toBe(false); // starts with 5
      expect(isValidIndianPhone('1234567890')).toBe(false); // starts with 1
      expect(isValidIndianPhone('987654321')).toBe(false); // only 9 digits
      expect(isValidIndianPhone('987654321012')).toBe(false); // 12 digits without +91
      expect(isValidIndianPhone('')).toBe(false);
      expect(isValidIndianPhone('abcdefghij')).toBe(false);
    });
  });

  describe('isValidNumber', () => {
    it('validates numbers and bounds', () => {
      expect(isValidNumber(10, 0, 100).isValid).toBe(true);
      expect(isValidNumber('50', 10, 100).isValid).toBe(true);

      const tooLow = isValidNumber(-5, 0, 100);
      expect(tooLow.isValid).toBe(false);
      expect(tooLow.error).toContain('less than 0');

      const tooHigh = isValidNumber(150, 0, 100);
      expect(tooHigh.isValid).toBe(false);
      expect(tooHigh.error).toContain('cannot exceed 100');

      const notANumber = isValidNumber('abc');
      expect(notANumber.isValid).toBe(false);
      expect(notANumber.error).toContain('Must be a valid numeric value');
    });
  });

  describe('isValidFutureDate', () => {
    it('identifies future dates correctly', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isValidFutureDate(tomorrow.toISOString()).isValid).toBe(true);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const pastResult = isValidFutureDate(yesterday.toISOString());
      expect(pastResult.isValid).toBe(false);
      expect(pastResult.error).toContain('must be in the future');
    });
  });

  describe('isDuplicate', () => {
    const coupons = [
      { id: '1', code: 'WELCOME10' },
      { id: '2', code: 'CHOVIQUE20' },
    ];

    it('detects duplicate values case-insensitively', () => {
      expect(isDuplicate(coupons, 'code', 'welcome10')).toBe(true);
      expect(isDuplicate(coupons, 'code', 'CHOVIQUE20')).toBe(true);
      expect(isDuplicate(coupons, 'code', 'NEWCODE')).toBe(false);
    });

    it('ignores the current item when updating (excludeId)', () => {
      expect(isDuplicate(coupons, 'code', 'WELCOME10', '1')).toBe(false);
      expect(isDuplicate(coupons, 'code', 'CHOVIQUE20', '1')).toBe(true);
    });
  });
});
