import { describe, it, expect } from 'vitest';
import { getSafeReturnUrl } from '../../features/auth/LoginPage';

describe('getSafeReturnUrl - Open Redirect Protection', () => {
  it('accepts safe internal relative paths', () => {
    expect(getSafeReturnUrl('/checkout')).toBe('/checkout');
    expect(getSafeReturnUrl('/shop')).toBe('/shop');
    expect(getSafeReturnUrl('/product/artisan-dark')).toBe('/product/artisan-dark');
    expect(getSafeReturnUrl('/')).toBe('/');
    expect(getSafeReturnUrl('/cart?coupon=CHOVIQUE10')).toBe('/cart?coupon=CHOVIQUE10');
  });

  it('rejects external protocol-relative URLs (open redirect vectors)', () => {
    expect(getSafeReturnUrl('//evil.com')).toBe('/');
    expect(getSafeReturnUrl('//malicious.site/phishing')).toBe('/');
    expect(getSafeReturnUrl('/\\evil.com')).toBe('/');
  });

  it('rejects absolute URLs pointing to external domains', () => {
    expect(getSafeReturnUrl('https://evil.com')).toBe('/');
    expect(getSafeReturnUrl('http://attacker.com/steal')).toBe('/');
    expect(getSafeReturnUrl('ftp://example.com')).toBe('/');
  });

  it('rejects dangerous script schemes (javascript:, data:)', () => {
    expect(getSafeReturnUrl('javascript:alert(1)')).toBe('/');
    expect(getSafeReturnUrl('data:text/html,<script>alert(1)</script>')).toBe('/');
  });

  it('handles null, undefined, and non-string inputs safely with default fallback', () => {
    expect(getSafeReturnUrl(null)).toBe('/');
    expect(getSafeReturnUrl(undefined)).toBe('/');
    expect(getSafeReturnUrl(123)).toBe('/');
    expect(getSafeReturnUrl({})).toBe('/');
    expect(getSafeReturnUrl('')).toBe('/');
    expect(getSafeReturnUrl('   ')).toBe('/');
  });
});
