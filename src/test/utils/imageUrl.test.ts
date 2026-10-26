import { describe, it, expect } from 'vitest';
import { getImageUrl } from '../../utils/imageUrl';

describe('getImageUrl Utility', () => {
  it('returns default fallback when URL is null, undefined, or empty', () => {
    const fallback = 'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=600&q=80';
    expect(getImageUrl(null)).toBe(fallback);
    expect(getImageUrl(undefined)).toBe(fallback);
    expect(getImageUrl('')).toBe(fallback);
    expect(getImageUrl('   ')).toBe(fallback);
  });

  it('preserves absolute URLs (Cloudinary, Unsplash, external HTTPS)', () => {
    const external = 'https://res.cloudinary.com/chovique/image/upload/truffle.png';
    expect(getImageUrl(external)).toBe(external);

    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    expect(getImageUrl(dataUri)).toBe(dataUri);

    const blobUri = 'blob:http://localhost:5173/abc-123';
    expect(getImageUrl(blobUri)).toBe(blobUri);
  });

  it('prepends backend base for relative paths starting with /', () => {
    const relative = '/api/v1/media/products/choc1.jpg';
    const result = getImageUrl(relative);
    expect(result).toContain(relative);
  });

  it('correctly routes bare S3 keys via /api/v1/media/', () => {
    const s3Key = 'chocolate-world/banners/gold-collection.png';
    const result = getImageUrl(s3Key);
    expect(result).toContain('/api/v1/media/chocolate-world/banners/gold-collection.png');
  });

  it('proxies private Tigris storage URLs to prevent direct browser 403 access', () => {
    const privateUrl = 'https://neat-crate.t3.storageapi.dev/chovique/chocolates/luxury-box.jpg';
    const result = getImageUrl(privateUrl);
    expect(result).toContain('/api/v1/media/chovique/chocolates/luxury-box.jpg');
    expect(result).not.toContain('storageapi.dev');
  });

  it('preserves frontend public static assets starting with /assets/ or assets/', () => {
    expect(getImageUrl('/assets/logo.png')).toBe('/assets/logo.png');
    expect(getImageUrl('assets/payments/razorpay.png')).toBe('/assets/payments/razorpay.png');
    expect(getImageUrl('/assets/payments/googlepay.png')).toBe('/assets/payments/googlepay.png');
  });
});
