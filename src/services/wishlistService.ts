/**
 * Wishlist Service — backend-persistent wishlist management.
 *
 * FastAPI endpoints (all require authentication via httpOnly cookie):
 *   GET    /wishlist              → WishlistItem[]
 *   GET    /wishlist/count        → { count: number }
 *   POST   /wishlist              → WishlistItem  (body: { product_id })
 *   DELETE /wishlist/{product_id} → 204
 */

import { apiGet, apiPost, apiDelete } from '../lib/api';
import type { Product } from '../types';

/** Shape of a wishlist item from the backend */
export interface WishlistItem {
  product_id: string;
  product: Product;
  added_at?: string;
}

export interface WishlistCountResponse {
  count: number;
}

export const wishlistService = {
  /** Fetch the user's full wishlist */
  getWishlist: (): Promise<WishlistItem[]> =>
    apiGet<WishlistItem[]>('/wishlist'),

  /** Get just the count of wishlist items */
  getWishlistCount: (): Promise<WishlistCountResponse> =>
    apiGet<WishlistCountResponse>('/wishlist/count'),

  /** Add a product to the wishlist */
  addToWishlist: (productId: string): Promise<WishlistItem> =>
    apiPost<WishlistItem>('/wishlist', { product_id: productId }),

  /** Remove a product from the wishlist */
  removeFromWishlist: (productId: string): Promise<void> =>
    apiDelete<void>(`/wishlist/${productId}`),

  /** Check whether a product is wishlisted */
  checkWishlistStatus: (productId: string): Promise<{ is_wishlisted: boolean }> =>
    apiGet<{ is_wishlisted: boolean }>(`/wishlist/check/${productId}`),

  /** Idempotently sync guest wishlist items into customer account */
  syncWishlist: (productIds: string[]): Promise<WishlistItem[]> =>
    apiPost<WishlistItem[]>('/wishlist/sync', { product_ids: productIds }),
};

