import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getGuestSession,
  generateGuestId,
  persistGuestCart,
  persistGuestWishlist,
  clearGuestShoppingData,
  getGuestCartForSync,
  getGuestWishlistForSync,
  GUEST_STORAGE_KEY,
  LEGACY_CART_KEY,
  LEGACY_WISHLIST_KEY,
  RETENTION_MS,
} from '../../utils/guestStorage';

describe('guestStorage - Persistent Guest Shopping Identity & Session', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Guest Identity & Versioned Session Creation', () => {
    it('creates a new session with a valid UUIDv4 guestId when none exists', () => {
      const session = getGuestSession();
      expect(session).toBeDefined();
      expect(session.guestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(session.version).toBe(1);
      expect(session.cart).toEqual([]);
      expect(session.wishlist).toEqual([]);
      expect(new Date(session.createdAt).getTime()).toBeGreaterThan(0);
      expect(new Date(session.updatedAt).getTime()).toBeGreaterThan(0);
      expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('reuses existing valid session across calls without regenerating guestId', () => {
      const firstSession = getGuestSession();
      const secondSession = getGuestSession();
      expect(secondSession.guestId).toBe(firstSession.guestId);
      expect(secondSession.createdAt).toBe(firstSession.createdAt);
    });

    it('gracefully recovers and creates a new session if localStorage contains corrupted JSON', () => {
      localStorage.setItem(GUEST_STORAGE_KEY, 'invalid-non-json{value');
      const session = getGuestSession();
      expect(session).toBeDefined();
      expect(session.guestId).toBeDefined();
      expect(session.cart).toEqual([]);
      expect(session.wishlist).toEqual([]);
    });

    it('generates unique cryptographic UUIDs across multiple calls', () => {
      const id1 = generateGuestId();
      const id2 = generateGuestId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('30-Day Retention & Expiration Policy', () => {
    it('automatically purges and renews session if it exceeds the 30-day retention period', () => {
      const oldTime = new Date(Date.now() - (RETENTION_MS + 1000)).toISOString();
      const expiredSession = {
        version: 1,
        guestId: 'old-expired-guest-id',
        createdAt: oldTime,
        updatedAt: oldTime,
        expiresAt: oldTime,
        cart: [{ productId: 'p1', quantity: 2, addedAt: oldTime }],
        wishlist: [{ productId: 'p1', addedAt: oldTime }],
      };
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(expiredSession));

      const renewed = getGuestSession();
      expect(renewed.guestId).not.toBe('old-expired-guest-id');
      expect(renewed.cart).toEqual([]);
      expect(renewed.wishlist).toEqual([]);
    });

    it('extends updatedAt and expiresAt timestamps on meaningful user interaction (sliding window)', () => {
      const session = getGuestSession();
      const initialUpdatedAt = new Date(session.updatedAt).getTime();

      vi.useFakeTimers();
      vi.advanceTimersByTime(5000);

      persistGuestCart([{ product: { id: 'prod-luxury-1' }, quantity: 2 }]);
      const updated = getGuestSession();
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(initialUpdatedAt);
      vi.useRealTimers();
    });
  });

  describe('Guest Cart Persistence & State Operations', () => {
    it('persists products in guest cart and retrieves sync payload', () => {
      persistGuestCart([
        { product: { id: 'prod-truffle' }, quantity: 2 },
        { product: { id: 'prod-bar' }, quantity: 4 },
      ]);

      const session = getGuestSession();
      expect(session.cart).toHaveLength(2);
      expect(session.cart[0].productId).toBe('prod-truffle');
      expect(session.cart[0].quantity).toBe(2);

      const syncPayload = getGuestCartForSync();
      expect(syncPayload).toEqual([
        { product_id: 'prod-truffle', quantity: 2 },
        { product_id: 'prod-bar', quantity: 4 },
      ]);
    });

    it('filters out items with non-positive quantities or missing IDs', () => {
      persistGuestCart([
        { product: { id: 'prod-valid' }, quantity: 3 },
        { product: { id: 'prod-invalid' }, quantity: 0 },
        { product: { id: '' }, quantity: 5 },
      ]);

      const syncPayload = getGuestCartForSync();
      expect(syncPayload).toHaveLength(1);
      expect(syncPayload[0]).toEqual({ product_id: 'prod-valid', quantity: 3 });
    });
  });

  describe('Guest Wishlist Persistence & Deduplication', () => {
    it('persists wishlist products and deduplicates identical product IDs', () => {
      persistGuestWishlist([
        { id: 'prod-w1' },
        { id: 'prod-w2' },
        { id: 'prod-w1' }, // Duplicate
      ]);

      const session = getGuestSession();
      expect(session.wishlist).toHaveLength(2);

      const syncPayload = getGuestWishlistForSync();
      expect(syncPayload).toEqual(['prod-w1', 'prod-w2']);
    });
  });

  describe('Data Clearing on Confirmed Merge', () => {
    it('clears cart and wishlist data while preserving the guestId identifier', () => {
      persistGuestCart([{ product: { id: 'prod-1' }, quantity: 2 }]);
      persistGuestWishlist([{ id: 'prod-w1' }]);

      const originalGuestId = getGuestSession().guestId;
      clearGuestShoppingData();

      const sessionAfter = getGuestSession();
      expect(sessionAfter.guestId).toBe(originalGuestId);
      expect(sessionAfter.cart).toEqual([]);
      expect(sessionAfter.wishlist).toEqual([]);
      expect(getGuestCartForSync()).toEqual([]);
      expect(getGuestWishlistForSync()).toEqual([]);
    });
  });

  describe('Legacy Data Migration', () => {
    it('migrates unversioned legacy localStorage keys seamlessly into versioned session', () => {
      const legacyCart = [{ productId: 'legacy-p1', quantity: 2 }];
      const legacyWishlist = [{ id: 'legacy-w1' }, { productId: 'legacy-w2' }];

      localStorage.setItem(LEGACY_CART_KEY, JSON.stringify(legacyCart));
      localStorage.setItem(LEGACY_WISHLIST_KEY, JSON.stringify(legacyWishlist));

      const session = getGuestSession();
      expect(session.cart).toHaveLength(1);
      expect(session.cart[0].productId).toBe('legacy-p1');
      expect(session.cart[0].quantity).toBe(2);

      expect(session.wishlist).toHaveLength(2);
      expect(session.wishlist.map((w) => w.productId)).toEqual(['legacy-w1', 'legacy-w2']);

      // Legacy keys should be cleanly removed after migration
      expect(localStorage.getItem(LEGACY_CART_KEY)).toBeNull();
      expect(localStorage.getItem(LEGACY_WISHLIST_KEY)).toBeNull();
    });
  });
});
