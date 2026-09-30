/**
 * Shipping & Logistics Service — dynamic fee calculation and Superadmin management.
 * All calls connect to the FastAPI backend.
 */

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../lib/api';
import type {
  ShippingCalculateRequest,
  ShippingCalculateResponse,
  StoreLocation,
  DeliveryServiceArea,
} from '../types';

export const shippingService = {
  /**
   * Dynamically calculate shipping charge and determine fulfillment mode (LOCAL vs COURIER)
   * based on the customer's delivery pincode, subtotal, and optional coordinates.
   */
  calculateShipping: async (
    payload: ShippingCalculateRequest
  ): Promise<ShippingCalculateResponse> => {
    try {
      return await apiPost<ShippingCalculateResponse>('/shipping/calculate', payload);
    } catch (error) {
      console.warn('Shipping calculation API failed, applying fallback policy:', error);
      // Defensive fallback if network is unreachable
      const subtotal = payload.subtotal ?? payload.cart_total ?? 0;
      const isFree = subtotal >= 500;
      return {
        serviceable: true,
        is_serviceable: true,
        fulfillment_type: 'COURIER',
        shipping_provider: 'Standard Courier',
        delivery_charge: isFree ? 0 : 50,
        free_delivery_applied: isFree,
        is_free_delivery: isFree,
        estimated_delivery: '2-4 business days',
        message: isFree ? 'Standard Courier Delivery (Free Delivery Applied)' : 'Standard Courier Delivery',
      };
    }
  },

  // =========================================================================
  // Superadmin Logistics API Management
  // =========================================================================

  /** Fetch all store locations (hub/flagship warehouses) */
  getStoreLocations: async (activeOnly = false): Promise<StoreLocation[]> => {
    return apiGet<StoreLocation[]>(
      `/superadmin/logistics/store-locations${activeOnly ? '?active_only=true' : ''}`
    );
  },

  /** Create a new store location */
  createStoreLocation: async (
    payload: Omit<StoreLocation, 'id' | 'created_at' | 'updated_at'>
  ): Promise<StoreLocation> => {
    return apiPost<StoreLocation>('/superadmin/logistics/store-locations', payload);
  },

  /** Update an existing store location */
  updateStoreLocation: async (
    id: string,
    payload: Partial<Omit<StoreLocation, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<StoreLocation> => {
    return apiPut<StoreLocation>(`/superadmin/logistics/store-locations/${id}`, payload);
  },

  /** Set a store as primary fulfillment origin */
  setPrimaryStore: async (id: string): Promise<StoreLocation> => {
    return apiPatch<StoreLocation>(`/superadmin/logistics/store-locations/${id}/set-primary`, {});
  },

  /** Deactivate/delete a store location */
  deleteStoreLocation: async (id: string): Promise<void> => {
    return apiDelete<void>(`/superadmin/logistics/store-locations/${id}`);
  },

  /** Fetch all delivery service area rules */
  getServiceAreas: async (activeOnly = false, mode?: string): Promise<DeliveryServiceArea[]> => {
    const params = new URLSearchParams();
    if (activeOnly) params.append('active_only', 'true');
    if (mode) params.append('mode', mode);
    const query = params.toString();
    return apiGet<DeliveryServiceArea[]>(
      `/superadmin/logistics/service-areas${query ? `?${query}` : ''}`
    );
  },

  /** Add a new local service area PIN code rule */
  createServiceArea: async (
    payload: Omit<DeliveryServiceArea, 'id' | 'created_at' | 'updated_at' | 'store_location'>
  ): Promise<DeliveryServiceArea> => {
    return apiPost<DeliveryServiceArea>('/superadmin/logistics/service-areas', payload);
  },

  /** Update a delivery service area rule */
  updateServiceArea: async (
    id: string,
    payload: Partial<Omit<DeliveryServiceArea, 'id' | 'created_at' | 'updated_at' | 'store_location'>>
  ): Promise<DeliveryServiceArea> => {
    return apiPut<DeliveryServiceArea>(`/superadmin/logistics/service-areas/${id}`, payload);
  },

  /** Delete a delivery service area rule */
  deleteServiceArea: async (id: string): Promise<void> => {
    return apiDelete<void>(`/superadmin/logistics/service-areas/${id}`);
  },
};
