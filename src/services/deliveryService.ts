/**
 * Delivery Boy & Admin Logistics Delivery API Service
 * Connects directly to FastAPI endpoints for delivery boy operations and admin management.
 */

import { apiGet, apiPost, apiPut, apiDelete, apiPostFormData } from '../lib/api';
import type { Order, DeliveryBoy } from '../types';

export interface DeliveryBoyProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  is_active: boolean;
  role: string;
  avatar_url?: string | null;
  created_at?: string | null;
}

export interface CreateDeliveryBoyPayload {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface UpdateDeliveryBoyPayload {
  full_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  is_active?: boolean;
}

export interface OutForDeliveryResponse {
  message: string;
  order: Order;
  delivery_otp?: string;
}

export interface CompleteDeliveryResponse {
  message: string;
  order: Order;
}

export const deliveryService = {
  // ─── Delivery Boy Operations ───────────────────────────────────────────────
  
  /** Fetch the logged-in delivery boy's profile */
  getProfile: (): Promise<DeliveryBoyProfile> =>
    apiGet<DeliveryBoyProfile>('/delivery-boy/profile'),

  /** Update logged-in delivery boy's profile details */
  updateProfile: (payload: { full_name?: string; phone?: string; avatar_url?: string; password?: string }): Promise<DeliveryBoyProfile> =>
    apiPut<DeliveryBoyProfile>('/delivery-boy/profile', payload),

  /** Upload avatar photo file */
  uploadAvatar: async (file: File): Promise<{ avatar_url: string; message: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiPostFormData<{ avatar_url: string; message: string }>('/delivery-boy/profile/avatar', formData);
  },

  /** Fetch all orders assigned to this delivery boy, optionally filtered */
  getAssignedOrders: (statusFilter?: string): Promise<Order[]> => {
    const qs = statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : '';
    return apiGet<Order[]>(`/delivery-boy/orders${qs}`);
  },

  /** Accept an assigned order */
  acceptOrder: (orderId: string): Promise<Order> =>
    apiPost<Order>(`/delivery-boy/orders/${orderId}/accept`),

  /** Accept all or selected assigned orders in batch */
  batchAcceptOrders: (orderIds?: string[]): Promise<{ message: string; count: number }> =>
    apiPost<{ message: string; count: number }>('/delivery-boy/orders/batch-accept', { order_ids: orderIds }),

  /** Reject an assigned order with an optional reason */
  rejectOrder: (orderId: string, reason?: string): Promise<{ message: string }> =>
    apiPost<{ message: string }>(`/delivery-boy/orders/${orderId}/reject`, { reason }),

  /** Mark order as picked up from the store */
  markPickedUp: (orderId: string): Promise<Order> =>
    apiPost<Order>(`/delivery-boy/orders/${orderId}/picked`),

  /** Mark order as Out for Delivery (generates customer OTP in the backend) */
  markOutForDelivery: (orderId: string): Promise<OutForDeliveryResponse> =>
    apiPost<OutForDeliveryResponse>(`/delivery-boy/orders/${orderId}/out-for-delivery`),

  /** Verify customer OTP and complete the delivery */
  completeDelivery: (orderId: string, otp: string): Promise<CompleteDeliveryResponse> =>
    apiPost<CompleteDeliveryResponse>(`/delivery-boy/orders/${orderId}/deliver`, { otp }),

  // ─── Admin Delivery Operations ─────────────────────────────────────────────

  /** List all delivery boys (Admin only) */
  getDeliveryBoys: (isActive?: boolean): Promise<DeliveryBoy[]> => {
    const qs = isActive !== undefined ? `?is_active=${isActive}` : '';
    return apiGet<DeliveryBoy[]>(`/admin/delivery-boys${qs}`);
  },

  /** Create a new delivery boy account (Admin only) */
  createDeliveryBoy: (payload: CreateDeliveryBoyPayload): Promise<DeliveryBoyProfile> =>
    apiPost<DeliveryBoyProfile>('/admin/delivery-boys', payload),

  /** Update an existing delivery boy account (Admin only) */
  updateDeliveryBoy: (id: string, payload: UpdateDeliveryBoyPayload): Promise<DeliveryBoyProfile> =>
    apiPut<DeliveryBoyProfile>(`/admin/delivery-boys/${id}`, payload),

  /** Deactivate a delivery boy account (Admin only) */
  deactivateDeliveryBoy: (id: string): Promise<{ message: string }> =>
    apiDelete<{ message: string }>(`/admin/delivery-boys/${id}`),

  /** Assign an order to a delivery boy (Admin only) */
  assignOrder: (orderId: string, deliveryBoyId: string): Promise<Order> =>
    apiPost<Order>(`/admin/orders/${orderId}/assign-delivery-boy`, { delivery_boy_id: deliveryBoyId }),

  /** Assign multiple orders to a delivery boy in batch (Admin only) */
  batchAssignOrders: (orderIds: string[], deliveryBoyId: string): Promise<{ message: string; count: number }> =>
    apiPost<{ message: string; count: number }>('/admin/orders/batch-assign-delivery-boy', {
      order_ids: orderIds,
      delivery_boy_id: deliveryBoyId,
    }),

  /** Unassign delivery boy from an order (Admin only) */
  unassignOrder: (orderId: string): Promise<Order> =>
    apiPost<Order>(`/admin/orders/${orderId}/unassign-delivery-boy`),

  /** Get delivery OTP for an order (Admin/Customer support audit) */
  getDeliveryOtp: (orderId: string): Promise<{ order_id: string; delivery_otp: string; status: string }> =>
    apiGet<{ order_id: string; delivery_otp: string; status: string }>(`/admin/orders/${orderId}/delivery-otp`),
};
