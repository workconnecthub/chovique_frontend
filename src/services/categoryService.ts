/**
 * Category Service — public and admin CRUD operations for categories.
 *
 * FastAPI endpoints:
 *   GET    /categories                      → Category[]  (public, active only)
 *   GET    /categories/{id_or_slug}         → Category    (public)
 *   GET    /categories/{slug}/products      → PaginatedResponse<Product> (public)
 *   GET    /admin/categories                → AdminCategory[] (admin, all including inactive)
 *   POST   /admin/categories                → AdminCategory (admin, multipart)
 *   PATCH  /admin/categories/{id}           → AdminCategory (admin)
 *   DELETE /admin/categories/{id}           → 204          (admin)
 *   POST   /admin/categories/{id}/image     → {image_url}  (admin, multipart)
 */

import { apiGet, apiDelete, apiPatch, apiPostFormData } from '../lib/api';
import type { Category, PaginatedResponse, Product } from '../types';

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  sort_order: number;
  is_active: boolean;
  product_count?: number;
  created_at?: string;
  updated_at?: string;
}

export const categoryService = {
  // =============================================
  // Public endpoints
  // =============================================

  /** List all active categories (public). */
  getCategories: (): Promise<Category[]> =>
    apiGet<Category[]>('/categories'),

  /** Get a single category by ID or slug (public). */
  getCategory: (idOrSlug: string): Promise<Category> =>
    apiGet<Category>(`/categories/${idOrSlug}`),

  /** Get paginated products for a category slug (public). */
  getCategoryProducts: (
    slug: string,
    page = 1,
    perPage = 12
  ): Promise<PaginatedResponse<Product>> =>
    apiGet<PaginatedResponse<Product>>(
      `/categories/${slug}/products?page=${page}&per_page=${perPage}`
    ),

  // =============================================
  // Admin-only endpoints
  // =============================================

  /** Fetch ALL categories including inactive (admin only). */
  adminGetAllCategories: (): Promise<AdminCategory[]> =>
    apiGet<AdminCategory[]>('/admin/categories'),

  /**
   * Create a new category (admin only).
   * Sends multipart/form-data to support optional image upload.
   */
  adminCreateCategory: (formData: FormData): Promise<AdminCategory> =>
    apiPostFormData<AdminCategory>('/admin/categories', formData),

  /** Update an existing category's fields (admin only). */
  adminUpdateCategory: (
    id: string,
    payload: Partial<{
      name: string;
      slug: string;
      description: string;
      image_url: string;
      sort_order: number;
      is_active: boolean;
    }>
  ): Promise<AdminCategory> =>
    apiPatch<AdminCategory>(`/admin/categories/${id}`, payload),

  /** Delete a category permanently (admin only). */
  adminDeleteCategory: (id: string): Promise<void> =>
    apiDelete<void>(`/admin/categories/${id}`),

  /** Get products assigned to category and whether it can be deleted. */
  adminGetCategoryProductSummary: (id: string): Promise<CategoryProductSummary> =>
    apiGet<CategoryProductSummary>(`/admin/categories/${id}/product-summary`),

  /**
   * Upload or replace a category image (admin only).
   * Sends multipart/form-data with an 'image' file field.
   */
  adminUploadCategoryImage: (
    id: string,
    formData: FormData
  ): Promise<{ image_url: string }> =>
    apiPostFormData<{ image_url: string }>(`/admin/categories/${id}/image`, formData),
};

export interface CategoryProductSummary {
  category_id: string;
  category_name: string;
  product_count: number;
  can_delete: boolean;
  products: Array<{
    id: string;
    name: string;
    price: number;
    stock: number;
    image: string | null;
  }>;
  message: string;
}
