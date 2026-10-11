/**
 * Helper validation utilities for CHOVIQUE Admin forms.
 * Enforces strict validation rules:
 * - Trimming whitespace
 * - Preventing empty strings
 * - Email format validation
 * - Phone format validation
 * - Numeric minimum/maximum validations
 * - Date and date-range validations
 * - Duplicate value checking
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const trimValue = (val: string): string => val ? val.trim() : '';

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimValue(email));
};

export const isValidPhone = (phone: string): boolean => {
  // Accepts standard international/national phone formats (e.g. +91 9876543210 or 9876543210)
  const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
  return phoneRegex.test(trimValue(phone));
};

/**
 * Validates 10-digit Indian mobile numbers (starting with 6, 7, 8, or 9)
 * with optional +91, 91, or leading 0 prefix.
 */
export const isValidIndianPhone = (phone: string): boolean => {
  if (!phone) return false;
  const trimmed = trimValue(phone);
  let digits = trimmed.replace(/[\s\-\(\)\+]/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }
  return digits.length === 10 && ['6', '7', '8', '9'].includes(digits[0]) && /^\d+$/.test(digits);
};

export const isNonEmpty = (val: string): boolean => {
  return trimValue(val).length > 0;
};

export const isValidNumber = (val: any, min?: number, max?: number): { isValid: boolean; error?: string } => {
  if (val === '' || val === null || val === undefined) {
    return { isValid: false, error: 'This field is required.' };
  }
  const num = Number(val);
  if (isNaN(num)) {
    return { isValid: false, error: 'Must be a valid numeric value.' };
  }
  if (min !== undefined && num < min) {
    return { isValid: false, error: `Value cannot be less than ${min}.` };
  }
  if (max !== undefined && num > max) {
    return { isValid: false, error: `Value cannot exceed ${max}.` };
  }
  return { isValid: true };
};

export const isValidFutureDate = (dateStr: string): { isValid: boolean; error?: string } => {
  if (!isNonEmpty(dateStr)) {
    return { isValid: false, error: 'Date is required.' };
  }
  const selectedDate = new Date(dateStr);
  const now = new Date();
  if (isNaN(selectedDate.getTime())) {
    return { isValid: false, error: 'Invalid date format.' };
  }
  if (selectedDate <= now) {
    return { isValid: false, error: 'Date must be in the future.' };
  }
  return { isValid: true };
};

export const isDuplicate = <T>(
  list: T[],
  key: keyof T,
  value: string,
  excludeId?: string,
  idKey: keyof T = 'id' as keyof T
): boolean => {
  const normalizedValue = trimValue(value).toLowerCase();
  return list.some((item) => {
    if (excludeId && String(item[idKey]) === String(excludeId)) {
      return false;
    }
    const itemVal = String(item[key] || '').toLowerCase().trim();
    return itemVal === normalizedValue;
  });
};
