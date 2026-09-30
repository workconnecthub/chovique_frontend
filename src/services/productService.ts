/**
 * Product Service — CRUD and listing operations for products.
 * All calls go directly to the FastAPI backend. No demo fallbacks.
 *
 * FastAPI endpoints:
 *   GET    /products                  → PaginatedResponse<Product>
 *   GET    /products/{id}             → Product
 *   POST   /products                  → Product  (multipart/form-data; admin only)
 *   PATCH  /products/{id}             → Product  (admin only)
 *   DELETE /products/{id}             → 204      (admin only)
 *   GET    /products/{id}/reviews     → Review[]
 *   POST   /products/{id}/reviews     → Review
 */

import { apiGet, apiPatch, apiDelete, apiPost, apiPostFormData } from '../lib/api';
import type { Product, PaginatedResponse, ProductQueryParams, ProductUpdatePayload, Review } from '../types';

export const productService = {
  /**
   * Fetch paginated, filtered, sorted product list.
   */
  getProducts: (params: ProductQueryParams = {}): Promise<PaginatedResponse<Product>> => {
    const query = new URLSearchParams();
    if (params.search)      query.set('search', params.search);
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.availability && params.availability !== 'all') query.set('availability', params.availability);
    if (params.price_min !== undefined) query.set('price_min', String(params.price_min));
    if (params.price_max !== undefined) query.set('price_max', String(params.price_max));
    if (params.min_rating !== undefined) query.set('min_rating', String(params.min_rating));
    if (params.sort)        query.set('sort', params.sort);
    if (params.page)        query.set('page', String(params.page));
    if (params.per_page)    query.set('per_page', String(params.per_page));
    const qs = query.toString();
    return apiGet<PaginatedResponse<Product>>(`/products${qs ? `?${qs}` : ''}`);
  },

  /** Fetch single product by ID. */
  getProduct: (id: string): Promise<Product> =>
    apiGet<Product>(`/products/${id}`),

  /**
   * Create a new product (admin only).
   * Sends multipart/form-data including optional image file.
   */
  createProduct: (formData: FormData): Promise<Product> =>
    apiPostFormData<Product>('/products', formData),

  /** Update an existing product (admin only). */
  updateProduct: (id: string, payload: ProductUpdatePayload): Promise<Product> =>
    apiPatch<Product>(`/products/${id}`, payload),

  /** Update an existing product's image (admin only). */
  updateProductImage: (id: string, formData: FormData): Promise<Product> =>
    apiPostFormData<Product>(`/products/${id}/image`, formData),

  /** Delete a product (admin only). */
  deleteProduct: (id: string): Promise<void> =>
    apiDelete<void>(`/products/${id}`),

  /** Fetch reviews for a product. */
  getProductReviews: (productId: string): Promise<Review[]> =>
    apiGet<Review[]>(`/products/${productId}/reviews`),

  /** Fetch reviews with rating summary & star breakdown for a product. */
  getProductReviewsWithSummary: (productId: string): Promise<{
    reviews: Review[];
    average_rating: number;
    total_reviews: number;
    star_breakdown: { [key: number]: number };
  }> => apiGet(`/products/${productId}/reviews`),

  /** Post a review for a product with optional photos and videos. */
  createProductReview: (
    productId: string,
    payload: FormData | { author?: string; rating: number; text: string; title?: string; images?: string[]; videos?: string[] }
  ): Promise<any> => {
    if (payload instanceof FormData) {
      return apiPostFormData<any>(`/products/${productId}/reviews`, payload);
    }
    return apiPost<any>(`/products/${productId}/reviews`, payload);
  },

  /** Fetch multiple products by ID (comma separated) */
  getBulkProducts: (ids: string): Promise<Product[]> =>
    apiGet<Product[]>(`/products/bulk?ids=${ids}`),

  /** Fetch personalized or general recommendations */
  getRecommendations: (limit = 4): Promise<Product[]> =>
    apiGet<Product[]>(`/products/recommendations?limit=${limit}`),

  /** Fetch related products for a specific product */
  getRelatedProducts: (productId: string, limit = 4): Promise<Product[]> =>
    apiGet<Product[]>(`/products/${productId}/related?limit=${limit}`),
};
