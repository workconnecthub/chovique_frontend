import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cartService } from '../../services/cartService';
import * as api from '../../lib/api';

vi.mock('../../lib/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('CartService and Coupon Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls POST /cart when adding product to cart', async () => {
    const mockResponse = {
      items: [{ product_id: 'prod-1', quantity: 2, product: { id: 'prod-1', name: 'Dark Truffle', price: 650, category: 'Truffles' } }],
      total: 1300,
    };
    (api.apiPost as any).mockResolvedValueOnce(mockResponse);

    const res = await cartService.addToCart('prod-1', 2);
    expect(api.apiPost).toHaveBeenCalledWith('/cart', { product_id: 'prod-1', quantity: 2 });
    expect(res.total).toBe(1300);
    expect(res.items.length).toBe(1);
  });

  it('calls PATCH /cart/{productId} when updating quantity', async () => {
    const mockResponse = {
      items: [{ product_id: 'prod-1', quantity: 3, product: { id: 'prod-1', name: 'Dark Truffle', price: 650, category: 'Truffles' } }],
      total: 1950,
    };
    (api.apiPatch as any).mockResolvedValueOnce(mockResponse);

    const res = await cartService.updateQuantity('prod-1', 3);
    expect(api.apiPatch).toHaveBeenCalledWith('/cart/prod-1', { quantity: 3 });
    expect(res.total).toBe(1950);
  });

  it('calls DELETE /cart/{productId} when removing item', async () => {
    const mockResponse = {
      items: [],
      total: 0,
    };
    (api.apiDelete as any).mockResolvedValueOnce(mockResponse);

    const res = await cartService.removeFromCart('prod-1');
    expect(api.apiDelete).toHaveBeenCalledWith('/cart/prod-1');
    expect(res.items.length).toBe(0);
  });

  it('validates coupons against the backend endpoint', async () => {
    const validCouponRes = {
      valid: true,
      code: 'CHOVIQUE20',
      discount_percent: 20,
      calculated_discount: 260,
      message: '20% discount applied!',
    };
    (api.apiPost as any).mockResolvedValueOnce(validCouponRes);

    const res = await cartService.validateCoupon('CHOVIQUE20');
    expect(api.apiPost).toHaveBeenCalledWith('/coupons/validate', { code: 'CHOVIQUE20' });
    expect(res.valid).toBe(true);
    expect(res.discount_percent).toBe(20);
  });

  it('handles invalid coupon response gracefully', async () => {
    const invalidCouponRes = {
      valid: false,
      code: 'INVALID',
      discount_percent: 0,
      message: 'Coupon code not found or expired',
    };
    (api.apiPost as any).mockResolvedValueOnce(invalidCouponRes);

    const res = await cartService.validateCoupon('INVALID');
    expect(res.valid).toBe(false);
    expect(res.message).toBe('Coupon code not found or expired');
  });
});
