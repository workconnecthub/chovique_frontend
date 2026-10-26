/**
 * Order Service — place and retrieve orders.
 * All calls go directly to the FastAPI backend. No demo fallbacks.
 *
 * FastAPI endpoints:
 *   POST /orders       → Order
 *   GET  /orders       → Order[]
 *   GET  /orders/{id}  → Order
 */

import { apiGet, apiPost, apiPostFormData, apiPut, apiGetHtml, apiGetBlob } from '../lib/api';
import type { Order, OrderPayload, CheckoutInitiateResponse, VerifyPaymentPayload, ReturnRequest } from '../types';

export const orderService = {
  /**
   * Place a new order.
   * Backend is responsible for: generating order ID, calculating totals,
   * setting status to 'Processing', clearing the server-side cart.
   */
  placeOrder: (payload: OrderPayload): Promise<Order> =>
    apiPost<Order>('/orders', payload),

  /** Fetch all orders for the authenticated user */
  getOrders: (): Promise<Order[]> =>
    apiGet<Order[]>('/orders'),

  /** Fetch a single order by ID */
  getOrder: (id: string): Promise<Order> =>
    apiGet<Order>(`/orders/${id}`),

  /** Get Invoice HTML */
  getInvoiceHtml: (id: string): Promise<string> =>
    apiGetHtml(`/orders/${id}/invoice`),

  /** Download Invoice PDF */
  downloadInvoicePdf: async (id: string): Promise<void> => {
    const blob = await apiGetBlob(`/orders/${id}/pdf`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  /** Cancel an order */
  cancelOrder: (id: string, reason?: string): Promise<Order> =>
    apiPost<Order>(`/orders/${id}/cancel`, { reason }),

  /** Request order return (within 30 minutes of delivery) */
  returnOrder: (id: string, reason?: string): Promise<Order> =>
    apiPost<Order>(`/orders/${id}/return`, { reason }),

  /** Submit return request with form data or json */
  submitReturnRequest: (
    id: string,
    data: FormData | { reason: string; description: string; photo_url?: string }
  ): Promise<Order> => {
    if (data instanceof FormData) {
      return apiPostFormData<Order>(`/orders/${id}/return`, data);
    }
    return apiPost<Order>(`/orders/${id}/return`, data);
  },

  /** Get return request details for an order */
  getOrderReturnRequest: (orderId: string): Promise<ReturnRequest> =>
    apiGet<ReturnRequest>(`/orders/${orderId}/return`),

  /** Get authenticated user's return requests */
  getMyReturns: (): Promise<ReturnRequest[]> =>
    apiGet<ReturnRequest[]>('/returns'),

  /** Admin: get all return requests */
  getAdminReturns: (): Promise<ReturnRequest[]> =>
    apiGet<ReturnRequest[]>('/admin/returns'),

  /** Admin: update return request status */
  updateReturnStatus: (
    returnId: string,
    status: string,
    adminNotes?: string
  ): Promise<ReturnRequest> =>
    apiPut<ReturnRequest>(`/admin/returns/${returnId}/status`, { status, admin_notes: adminNotes }),

  /** Initiate Razorpay Checkout */
  initiateCheckout: (payload: OrderPayload): Promise<CheckoutInitiateResponse> =>
    apiPost<CheckoutInitiateResponse>('/checkout/initiate', payload),

  /** Verify Razorpay Payment */
  verifyPayment: (payload: VerifyPaymentPayload): Promise<{ success: boolean; message: string; order_id: string }> =>
    apiPost<{ success: boolean; message: string; order_id: string }>('/payments/verify', payload),
};
