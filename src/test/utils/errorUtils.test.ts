import { describe, it, expect } from 'vitest';
import {
  formatApiErrorMessage,
  cleanValidationMessage,
  formatFieldLabel,
  formatPydanticErrorItem,
  getStatusFallback,
} from '../../utils/errorUtils';
import { ApiError } from '../../lib/api';

describe('Error Formatting Utilities (formatApiErrorMessage)', () => {
  describe('Pydantic Validation Errors', () => {
    it('formats single Pydantic error array into clean human message (matching screenshot issue)', () => {
      const rawScreenshotError = [
        {
          type: 'value_error',
          loc: ['body', 'phone'],
          msg: 'Value error, Invalid Indian phone number. Must be a 10-digit number starting with 6, 7, 8, or 9.',
          input: '6309880',
          ctx: { error: {} },
        },
      ];

      const result = formatApiErrorMessage(rawScreenshotError);
      expect(result).toBe('Phone Number: Invalid Indian phone number. Must be a 10-digit number starting with 6, 7, 8, or 9.');
      expect(result).not.toContain('Value error');
      expect(result).not.toContain('{"type"');
    });

    it('formats stringified Pydantic error JSON string into clean human message', () => {
      const stringifiedJson =
        '[{"type":"value_error","loc":["body","phone"],"msg":"Value error, Invalid Indian phone number. Must be a 10-digit number starting with 6, 7, 8, or 9.","input":"6309880","ctx":{"error":{}}}]';

      const result = formatApiErrorMessage(stringifiedJson);
      expect(result).toBe('Phone Number: Invalid Indian phone number. Must be a 10-digit number starting with 6, 7, 8, or 9.');
    });

    it('formats multiple Pydantic validation errors cleanly joined with bullets', () => {
      const multipleErrors = [
        {
          type: 'value_error',
          loc: ['body', 'phone'],
          msg: 'Value error, Invalid Indian phone number. Must be a 10-digit number starting with 6, 7, 8, or 9.',
        },
        {
          type: 'string_too_short',
          loc: ['body', 'password'],
          msg: 'Password must be at least 8 characters long.',
        },
      ];

      const result = formatApiErrorMessage(multipleErrors);
      expect(result).toContain('Phone Number: Invalid Indian phone number. Must be a 10-digit number starting with 6, 7, 8, or 9.');
      expect(result).toContain('Password must be at least 8 characters long.');
      expect(result).toContain(' • ');
    });

    it('formats missing field error as "{Field} is required."', () => {
      const missingError = [
        {
          type: 'missing',
          loc: ['body', 'email'],
          msg: 'Field required',
        },
      ];

      const result = formatApiErrorMessage(missingError);
      expect(result).toBe('Email Address is required.');
    });
  });

  describe('cleanValidationMessage', () => {
    it('strips "Value error, " and "assertion error, " prefixes', () => {
      expect(cleanValidationMessage('Value error, Password confirmation does not match.')).toBe(
        'Password confirmation does not match.'
      );
      expect(cleanValidationMessage('assertion error: Invalid date.')).toBe('Invalid date.');
      expect(cleanValidationMessage('Input should be a string')).toBe('Must be a string.');
    });

    it('capitalizes and adds period to sentences', () => {
      expect(cleanValidationMessage('invalid phone number')).toBe('Invalid phone number.');
    });
  });

  describe('formatFieldLabel', () => {
    it('maps known fields to user-friendly titles', () => {
      expect(formatFieldLabel('phone')).toBe('Phone Number');
      expect(formatFieldLabel('full_name')).toBe('Full Name');
      expect(formatFieldLabel('confirm_password')).toBe('Confirm Password');
      expect(formatFieldLabel('pin_code')).toBe('PIN Code');
      expect(formatFieldLabel('is_active')).toBe('Status');
    });

    it('formats unknown snake_case and camelCase fields nicely', () => {
      expect(formatFieldLabel('delivery_note')).toBe('Delivery Note');
      expect(formatFieldLabel('customerFeedback')).toBe('Customer Feedback');
    });
  });

  describe('ApiError integration', () => {
    it('extracts formatted message from ApiError instance', () => {
      const apiErr = new ApiError(
        422,
        '[{"type":"value_error","loc":["body","phone"],"msg":"Value error, Invalid Indian phone number. Must be a 10-digit number starting with 6, 7, 8, or 9."}]'
      );
      const result = formatApiErrorMessage(apiErr);
      expect(result).toBe('Phone Number: Invalid Indian phone number. Must be a 10-digit number starting with 6, 7, 8, or 9.');
    });

    it('returns custom message when detail is plain text', () => {
      const apiErr = new ApiError(400, 'User with this email already exists.');
      expect(formatApiErrorMessage(apiErr)).toBe('User with this email already exists.');
    });
  });

  describe('HTTP Status Code Fallbacks', () => {
    it('returns user-friendly fallback for standard error codes', () => {
      expect(getStatusFallback(401)).toBe('Your session has expired. Please log in again.');
      expect(getStatusFallback(403)).toBe('You do not have permission to perform this action.');
      expect(getStatusFallback(404)).toBe('The requested record or resource was not found.');
      expect(getStatusFallback(422)).toBe('Validation error. Please verify the entered form data and try again.');
      expect(getStatusFallback(500)).toBe('Server encountered an error. Please try again later or contact support.');
    });
  });
});
