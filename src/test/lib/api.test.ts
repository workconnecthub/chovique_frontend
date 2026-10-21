import { describe, it, expect, beforeEach } from 'vitest';
import {
  ApiError,
  BASE_URL,
  getAuthToken,
  setAuthToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
  isTokenExpired,
} from '../../lib/api';

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

  it('correctly sets, retrieves, and clears refresh token in storage', () => {
    expect(getRefreshToken()).toBeNull();

    setRefreshToken('mock-refresh-token-123');
    expect(getRefreshToken()).toBe('mock-refresh-token-123');

    setAuthToken('mock-access-token-456');
    clearTokens();

    expect(getAuthToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('correctly evaluates token expiration', () => {
    expect(isTokenExpired(null)).toBe(true);
    expect(isTokenExpired('invalid-token')).toBe(false);

    // Expired token (exp in past)
    const expiredPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 100 }));
    const expiredToken = `header.${expiredPayload}.signature`;
    expect(isTokenExpired(expiredToken)).toBe(true);

    // Fresh token (exp in future)
    const freshPayload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    const freshToken = `header.${freshPayload}.signature`;
    expect(isTokenExpired(freshToken)).toBe(false);
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
