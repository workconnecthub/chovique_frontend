import { describe, it, expect, beforeEach } from 'vitest';
import { ApiError, BASE_URL, getAuthToken, setAuthToken } from '../../lib/api';

describe('API Client and Security Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('correctly sets and retrieves auth token in storage', () => {
    expect(getAuthToken()).toBeNull();

    setAuthToken('mock-jwt-token-xyz');
    expect(getAuthToken()).toBe('mock-jwt-token-xyz');

    setAuthToken(null);
    expect(getAuthToken()).toBeNull();
  });

  it('properly configures BASE_URL with /api/v1 prefix', () => {
    expect(BASE_URL).toBeDefined();
    expect(BASE_URL.endsWith('/api/v1')).toBe(true);
  });

  it('constructs ApiError with status and detailed error message', () => {
    const error = new ApiError(404, 'Item not found');
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(404);
    expect(error.detail).toBe('Item not found');
    expect(error.message).toBe('Item not found');
  });

  it('handles 401 Unauthorized status errors gracefully', () => {
    const error = new ApiError(401, 'Invalid authentication credentials');
    expect(error.status).toBe(401);
  });
});
