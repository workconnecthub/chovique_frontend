/**
 * Admin Service — user management, offline sales, CSV import, banners,
 * testimonials, reels, and site-wide order/ticket views.
 * All calls go directly to the FastAPI backend.
 */

import { BASE_URL, apiDelete, apiGet, apiPatch, apiPatchFormData, apiPost, apiPostFormData, apiPut, setAuthToken } from '../lib/api';
import type {
  Banner,
  Testimonial,
  InstagramReel,
  OfflineSale,
  Order,
  SupportTicket,
  SystemUser,
  ImportSalesResponse,
  ResolveTicketPayload,
  CustomerDetailsResponse,
  Review,
  AvatarUploadResponse,
} from '../types';

/** Payload for /admin/offline-sales POST — matches backend OfflineSalePayload */
export interface AdminOfflineSalePayload {
  company_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_method: string;
  discount?: number;
  tax?: number;
  items?: Array<{
    product_id: string;
    quantity: number;
  }>;
  // Payment-Method-Specific Details
  payment_status?: string;
  received_amount?: number;
  receipt_number?: string;
  card_type?: string;
  card_last4?: string;
  transaction_id?: string;
  upi_id?: string;
  bank_name?: string;
  account_holder?: string;
  // Legacy single product fallback fields
  product_name?: string;
  quantity?: number;
  total_price?: number;
}

/** Payload for /admin/orders/{id}/status PATCH */
export interface UpdateOrderStatusPayload {
  status?: string;
  payment_status?: string;
}

export interface AdminNotification {
  id: string;
  admin_id?: string | null;
  type: string;
  title: string;
  message: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AdminNotificationListResponse {
  items: AdminNotification[];
  total: number;
  page: number;
  limit: number;
  unread_count: number;
}

export interface AdminProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  role: string;
  avatar_url?: string | null;
  created_at: string;
  last_login_at?: string | null;
}

export interface UpdateAdminProfilePayload {
  full_name: string;
  email: string;
  phone: string;
  address: string;
}

export interface ActivityLogItem {
  id: string;
  admin_id?: string | null;
  admin_name?: string | null;
  admin_email?: string | null;
  action: string;
  module: string;
  description: string;
  ip_address?: string | null;
  user_agent?: string | null;
  status: string;
  created_at: string;
}

export interface ActivityLogListResponse {
  items: ActivityLogItem[];
  total: number;
  page: number;
  limit: number;
}

/** Dashboard stats shape from /admin/stats */
export interface DashboardStats {
  total_sales: number;
  total_orders: number;
  total_customers: number;
  total_products: number;
  low_stock_products_count: number;
  pending_tickets_count: number;
  total_units_sold: number;
  total_inventory_stock: number;
  total_online_revenue: number;
  total_offline_revenue: number;
  admin_count: number;
  reward_coins_issued?: number;
  monthly_revenue: { month: string; online_revenue: number; offline_revenue: number; total: number }[];
  top_products: { name: string; units_sold: number; stock: number; revenue: number }[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  user_name?: string;
  user_email?: string;
  resource?: string;
  details?: string;
  created_at: string;
}

export const adminService = {
  /** Fetch admin dashboard analytics stats with optional date range parameters. */
  getStats: (params?: { preset?: string; start_date?: string; end_date?: string }): Promise<DashboardStats> => {
    const query = new URLSearchParams();
    if (params?.preset) query.append('preset', params.preset);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    const qs = query.toString();
    return apiGet<DashboardStats>(`/admin/stats${qs ? `?${qs}` : ''}`);
  },

  /** Specific dashboard endpoints using PostgreSQL aggregations */
  getDashboardSummary: (params?: { preset?: string; start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams();
    if (params?.preset) query.append('preset', params.preset);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    const qs = query.toString();
    return apiGet<any>(`/admin/dashboard/summary${qs ? `?${qs}` : ''}`);
  },

  getSalesChart: (params?: { preset?: string; start_date?: string; end_date?: string }) => {
    const query = new URLSearchParams();
    if (params?.preset) query.append('preset', params.preset);
    if (params?.start_date) query.append('start_date', params.start_date);
    if (params?.end_date) query.append('end_date', params.end_date);
    const qs = query.toString();
    return apiGet<{ timeframe: string; points: { date: string; sales: number; orders_count: number }[] }>(`/admin/dashboard/sales-chart${qs ? `?${qs}` : ''}`);
  },

  getTopProducts: (limit: number = 5) => apiGet<any>(`/admin/dashboard/top-products?limit=${limit}`),
  getRecentOrders: (limit: number = 5) => apiGet<any>(`/admin/dashboard/recent-orders?limit=${limit}`),
  getLowStockProducts: (threshold: number = 10, limit: number = 10) => apiGet<any>(`/admin/dashboard/low-stock-products?threshold=${threshold}&limit=${limit}`),

  /** Fetch recent audit logs. */
  getAuditLogs: (limit: number = 50): Promise<AuditLogEntry[]> =>
    apiGet<AuditLogEntry[]>(`/admin/audit-logs?limit=${limit}`),

  /** Fetch all registered users. */
  getUsers: (): Promise<SystemUser[]> =>
    apiGet<SystemUser[]>('/admin/users'),

  /** Fetch paginated customers with optional search and status filter */
  getCustomers: (params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    summary: {
      total_customers: number;
      active_accounts: number;
      total_orders_placed: number;
      lifetime_spend: number;
    };
  }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search && params.search.trim()) query.append('search', params.search.trim());
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    const qs = query.toString();
    return apiGet<any>(`/admin/customers${qs ? `?${qs}` : ''}`);
  },

  /** Fetch customer details with real backend order calculation */
  getCustomerDetails: (userId: string): Promise<CustomerDetailsResponse> =>
    apiGet<CustomerDetailsResponse>(`/admin/customers/${userId}`),

  /** Generate business reports (sales, orders, products, customers, coupons, reward_coins) */
  getReport: (params: {
    report_type: string;
    start_date: string;
    end_date: string;
    page?: number;
    limit?: number;
  }): Promise<any> => {
    const query = new URLSearchParams();
    query.append('report_type', params.report_type);
    query.append('start_date', params.start_date);
    query.append('end_date', params.end_date);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    return apiGet<any>(`/admin/reports?${query.toString()}`);
  },

  /** Download report Excel file */
  downloadExcelReport: async (params: { report_type: string; start_date: string; end_date: string }): Promise<void> => {
    const url = `${BASE_URL}/admin/reports/${params.report_type}/export/excel?start_date=${params.start_date}&end_date=${params.end_date}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to download report Excel.');
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${params.report_type}_report_${params.start_date}_to_${params.end_date}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  },

  /** Download report PDF file */
  downloadPdfReport: async (params: { report_type: string; start_date: string; end_date: string }): Promise<void> => {
    const url = `${BASE_URL}/admin/reports/${params.report_type}/export/pdf?start_date=${params.start_date}&end_date=${params.end_date}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to download report PDF.');
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${params.report_type}_report_${params.start_date}_to_${params.end_date}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
  },

  /** Download report CSV file */
  downloadCsvReport: async (params: { report_type: string; start_date: string; end_date: string }): Promise<void> => {
    const url = `${BASE_URL}/admin/reports/${params.report_type}/export/csv?start_date=${params.start_date}&end_date=${params.end_date}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to download report CSV.');
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${params.report_type}_report_${params.start_date}_to_${params.end_date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  /** Get admin notifications */
  getAdminNotifications: (params?: { type?: string; is_read?: boolean; page?: number; limit?: number }): Promise<AdminNotificationListResponse> => {
    const q = new URLSearchParams();
    if (params?.type && params.type !== 'all') q.set('type', params.type);
    if (params?.is_read !== undefined) q.set('is_read', String(params.is_read));
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiGet<AdminNotificationListResponse>(`/admin/notifications?${q.toString()}`);
  },

  /** Get unread notification count */
  getAdminUnreadCount: (): Promise<{ unread_count: number }> =>
    apiGet<{ unread_count: number }>('/admin/notifications/unread-count'),

  /** Mark single notification as read */
  markNotificationAsRead: (id: string): Promise<AdminNotification> =>
    apiPatch<AdminNotification>(`/admin/notifications/${id}/read`, {}),

  /** Mark all notifications as read */
  markAllNotificationsAsRead: (): Promise<{ message: string; updated_count: number }> =>
    apiPost<{ message: string; updated_count: number }>('/admin/notifications/read-all', {}),

  /** Delete single notification */
  deleteNotification: (id: string): Promise<void> =>
    apiDelete<void>(`/admin/notifications/${id}`),

  /** Get current admin profile */
  getAdminProfile: (): Promise<AdminProfile> =>
    apiGet<AdminProfile>('/admin/profile'),

  /** Update current admin profile */
  updateAdminProfile: (payload: UpdateAdminProfilePayload): Promise<AdminProfile> =>
    apiPut<AdminProfile>('/admin/profile', payload),

  /** Upload current admin avatar image */
  uploadAdminAvatar: (formData: FormData): Promise<AvatarUploadResponse> =>
    apiPostFormData<AvatarUploadResponse>('/admin/profile/avatar', formData),

  /** Change admin password */
  changeAdminPassword: (payload: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }): Promise<{ message: string }> =>
    apiPost<{ message: string }>('/admin/change-password', payload),

  /** Get immutable admin activity logs */
  getActivityLogs: (params?: {
    page?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
    module?: string;
    action?: string;
    status?: string;
    search?: string;
  }): Promise<ActivityLogListResponse> => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.start_date) q.set('start_date', params.start_date);
    if (params?.end_date) q.set('end_date', params.end_date);
    if (params?.module && params.module !== 'all') q.set('module', params.module);
    if (params?.action && params.action !== 'all') q.set('action', params.action);
    if (params?.status && params.status !== 'all') q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    return apiGet<ActivityLogListResponse>(`/admin/activity-logs?${q.toString()}`);
  },

  /** Secure admin logout */
  adminLogout: async (): Promise<{ message: string }> => {
    setAuthToken(null);
    return apiPost<{ message: string }>('/admin/logout', {});
  },

  /** Update customer profile details */
  updateCustomer: (userId: string, payload: any): Promise<CustomerDetailsResponse> =>
    apiPatch<CustomerDetailsResponse>(`/admin/customers/${userId}`, payload),

  /** Create a new customer account directly (admin/superadmin action). */
  createCustomer: (payload: {
    full_name: string;
    email: string;
    phone?: string;
    password?: string;
    gender?: string;
    house_number?: string;
    street?: string;
    area?: string;
    landmark?: string;
    city?: string;
    district?: string;
    state?: string;
    zip?: string;
    is_active?: boolean;
  }): Promise<CustomerDetailsResponse> =>
    apiPost<CustomerDetailsResponse>('/admin/customers', payload),

  /** Delete a customer account */
  deleteCustomer: (userId: string): Promise<void> =>
    apiDelete<void>(`/admin/customers/${userId}`),

  /** Create a new administrator user (superadmin action). */
  createAdmin: (payload: {
    full_name: string;
    email: string;
    password: string;
    role?: string;
  }): Promise<SystemUser> =>
    apiPost<SystemUser>('/admin/users', payload),

  /** Delete or revoke a user account (superadmin action). */
  deleteUser: (userId: string): Promise<void> =>
    apiDelete<void>(`/admin/users/${userId}`),

  /** Promote an admin to superadmin. */
  promoteAdmin: (userId: string): Promise<SystemUser> =>
    apiPost<SystemUser>(`/admin/users/${userId}/promote`, {}),

  /** Demote a superadmin to admin. */
  demoteAdmin: (userId: string): Promise<SystemUser> =>
    apiPost<SystemUser>(`/admin/users/${userId}/demote`, {}),

  /** Fetch all orders site-wide (supports status, payment_status, fulfillment_type, search, date range, and pagination params). */
  getAllOrders: (params?: {
    status?: string;
    payment_status?: string;
    fulfillment_type?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: Order[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    summary: {
      total_orders: number;
      processing: number;
      confirmed: number;
      shipped: number;
      out_for_delivery: number;
      delivered: number;
      cancelled: number;
      pending_payment: number;
      paid: number;
      failed_payment: number;
      refunded: number;
      total_revenue: number;
      local_orders?: number;
      courier_orders?: number;
      unassigned_local?: number;
    };
  }> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.payment_status && params.payment_status !== 'ALL') query.append('payment_status', params.payment_status);
    if (params?.fulfillment_type && params.fulfillment_type !== 'ALL') query.append('fulfillment_type', params.fulfillment_type);
    if (params?.search && params.search.trim()) query.append('search', params.search.trim());
    if (params?.date_from) query.append('date_from', params.date_from);
    if (params?.date_to) query.append('date_to', params.date_to);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const queryString = query.toString();
    return apiGet<any>(`/admin/orders${queryString ? `?${queryString}` : ''}`);
  },

  /** Update an order's status. */
  updateOrderStatus: (orderId: string, payload: UpdateOrderStatusPayload): Promise<Order> =>
    apiPatch<Order>(`/admin/orders/${orderId}/status`, payload),

  /** Push a courier order to iThink Logistics API */
  pushOrderToIThink: (orderId: string): Promise<any> =>
    apiPost<any>(`/admin/orders/${orderId}/push-ithink`, {}),

  /** Get iThink Logistics credentials status */
  getIThinkConfig: (): Promise<{ configured: boolean; api_key: string; provider: string; supported_couriers: string[] }> =>
    apiGet<any>('/admin/shipping/ithink/config'),

  /** Update iThink Logistics credentials */
  updateIThinkConfig: (payload: { api_key: string; secret_key: string }): Promise<{ message: string; status: string; configured: boolean; api_key_masked: string }> =>
    apiPost<any>('/admin/shipping/ithink/config', payload),

  /** Fetch all support tickets site-wide. */
  getAllTickets: (): Promise<SupportTicket[]> =>
    apiGet<SupportTicket[]>('/admin/tickets'),

  /** Theme Management */
  getThemes: (): Promise<any[]> =>
    apiGet<any[]>('/theme/'),
  
  saveTheme: (payload: { name: string; properties_json: string }): Promise<any> =>
    apiPost<any>('/theme/', payload),
    
  deleteTheme: (themeId: string): Promise<void> =>
    apiDelete<void>(`/theme/${themeId}`),
    
  setActiveTheme: (themeId: string): Promise<void> =>
    apiPut<void>(`/theme/${themeId}/active`, {}),

  /** Resolve a support ticket (admin action). */
  resolveTicket: (ticketId: string, payload: ResolveTicketPayload): Promise<SupportTicket> =>
    apiPut<SupportTicket>(`/admin/tickets/${ticketId}/resolve`, payload),

  /** Update an intermediate support ticket status (admin action). */
  updateTicketStatus: (ticketId: string, payload: { status: string; admin_notes?: string }): Promise<SupportTicket> =>
    apiPost<SupportTicket>(`/admin/tickets/${ticketId}/status`, payload),

  /** Fetch all offline (POS) sales records. */
  getOfflineSales: (): Promise<OfflineSale[]> =>
    apiGet<OfflineSale[]>('/admin/offline-sales'),

  /** Manually log a single offline sale. */
  addOfflineSale: (payload: AdminOfflineSalePayload): Promise<OfflineSale> =>
    apiPost<OfflineSale>('/admin/offline-sales', payload),

  /** Update an existing offline sale record. */
  updateOfflineSale: (id: string, payload: Partial<AdminOfflineSalePayload>): Promise<OfflineSale> =>
    apiPatch<OfflineSale>(`/admin/offline-sales/${id}`, payload),

  /**
   * Upload a CSV file for bulk offline sales import.
   * All parsing is done server-side.
   */
  importOfflineSales: (formData: FormData): Promise<ImportSalesResponse> =>
    apiPostFormData<ImportSalesResponse>('/admin/offline-sales/import', formData),

  /**
   * Create a new hero banner slide (multipart/form-data upload to Cloudinary).
   */
  createBanner: (formData: FormData): Promise<Banner> =>
    apiPostFormData<Banner>('/admin/banners', formData),

  /**
   * Create a new testimonial with avatar upload to Cloudinary.
   */
  createTestimonial: (formData: FormData): Promise<Testimonial> =>
    apiPostFormData<Testimonial>('/admin/testimonials', formData),

  /**
   * Create a new Instagram reel entry with video upload to Cloudinary.
   */
  createReel: (formData: FormData): Promise<InstagramReel> =>
    apiPostFormData<InstagramReel>('/admin/reels', formData),

  /**
   * Auto-fetch Instagram reel video and account handle from an Instagram URL.
   */
  fetchReelMeta: (url: string): Promise<{ account_name: string; video_url: string | null; instagram_url: string; shortcode: string }> =>
    apiPost<{ account_name: string; video_url: string | null; instagram_url: string; shortcode: string }>('/admin/reels/fetch-meta', { url }),

  /**
   * Delete an Instagram reel entry.
   */
  deleteReel: (reelId: string): Promise<void> =>
    apiDelete<void>(`/admin/reels/${reelId}`),

  /**
   * Update an Instagram reel entry (text fields + optional new video file).
   */
  updateReel: (reelId: string, formData: FormData): Promise<any> =>
    apiPatchFormData<any>(`/admin/reels/${reelId}`, formData),

  /**
   * Fetch all testimonials for admin moderation (supports status filter).
   */
  adminGetTestimonials: (status?: string): Promise<Testimonial[]> =>
    apiGet<Testimonial[]>(`/admin/testimonials${status ? `?status=${status}` : ''}`),

  /**
   * Approve, reject, or update status of a testimonial.
   */
  updateTestimonialStatus: (testimonialId: string, status: string): Promise<Testimonial> =>
    apiPatch<Testimonial>(`/admin/testimonials/${testimonialId}/status`, { status }),

  /**
   * Delete a customer testimonial.
   */
  deleteTestimonial: (testimonialId: string): Promise<void> =>
    apiDelete<void>(`/admin/testimonials/${testimonialId}`),

  /**
   * Get all product reviews site-wide (admin moderation).
   */
  adminGetReviews: (): Promise<any[]> =>
    apiGet<any[]>('/admin/reviews'),

  /**
   * Update status of a product review (approved, pending, rejected) and landing page feature status.
   */
  adminUpdateReviewStatus: (
    reviewId: string,
    status: string,
    is_featured_on_home?: boolean
  ): Promise<{ id: string; status: string; is_featured_on_home?: boolean }> =>
    apiPatch<{ id: string; status: string; is_featured_on_home?: boolean }>(
      `/admin/reviews/${reviewId}/status`,
      { status, is_featured_on_home }
    ),

  /**
   * Delete a product review and recalculate product rating.
   */
  adminDeleteReview: (reviewId: string): Promise<void> =>
    apiDelete<void>(`/admin/reviews/${reviewId}`),

  /**
   * Update homepage site stats (happy customers, flavors, etc.).
   */
  updateSiteStats: (payload: {
    happy_customers: number;
    unique_flavors: number;
    countries_shipped: number;
    five_star_reviews_percent: number;
  }): Promise<any> =>
    apiPatch<any>('/admin/config/stats', payload),

  /**
   * Upload a banner image for a hero slide (superadmin action).
   */
  uploadBannerImage: (
    bannerId: string,
    formData: FormData
  ): Promise<{ image_url: string }> =>
    apiPostFormData<{ image_url: string }>(`/admin/banners/${bannerId}/image`, formData),

  /**
   * Delete a hero banner slide (superadmin action).
   */
  deleteBanner: (bannerId: string): Promise<void> =>
    apiDelete<void>(`/admin/banners/${bannerId}`),

  /**
   * Update an administrator user's password (superadmin action).
   */
  updateAdminPassword: (
    userId: string,
    password: string
  ): Promise<{ message: string }> =>
    apiPatch<{ message: string }>(`/admin/users/${userId}/password`, { password }),

  /**
   * Update an administrator's profile details (name, email) — superadmin action.
   */
  updateAdmin: (
    userId: string,
    payload: { full_name?: string; email?: string }
  ): Promise<SystemUser> =>
    apiPatch<SystemUser>(`/admin/users/${userId}`, payload),

  /**
   * Fetch all contact form submissions (admin view).
   */
  getContactMessages: (): Promise<{ id: string; name: string; email: string; phone?: string; subject?: string; message: string; created_at: string }[]> =>
    apiGet<any[]>('/admin/contact-messages'),

  /**
   * Delete a contact form submission.
   */
  deleteContactMessage: (messageId: string): Promise<void> =>
    apiDelete<void>(`/admin/contact-messages/${messageId}`),

  /**
   * Upload video for Our Story crafting process.
   */
  uploadStoryVideo: (formData: FormData): Promise<{ video_url: string }> =>
    apiPostFormData<{ video_url: string }>('/admin/story-video', formData),

  /**
   * Get Our Story video URL.
   */
  getStoryVideo: (): Promise<{ video_url: string }> =>
    apiGet<{ video_url: string }>('/home/story-video'),

  /**
   * Delete / Reset Our Story video URL.
   */
  deleteStoryVideo: (): Promise<{ video_url: string }> =>
    apiDelete<{ video_url: string }>('/admin/story-video'),

  /**
   * Fetch site contact info (phone, whatsapp, email, support_hours, address).
   */
  getContactInfo: (): Promise<{ email: string; phone: string; whatsapp: string; support_hours: string; address: string }> =>
    apiGet<any>('/home/contact'),

  /**
   * Update site contact info (admin action).
   */
  updateContactInfo: (payload: {
    email?: string;
    phone?: string;
    whatsapp?: string;
    support_hours?: string;
    address?: string;
  }): Promise<any> =>
    apiPatch<any>('/admin/config/contact', payload),

  // ======================================================
  // Coupons
  // ======================================================

  getCoupons: (): Promise<any[]> => apiGet<any[]>('/admin/coupons'),
  
  createCoupon: (payload: {
    code: string;
    description: string;
    discount_percent?: number;
    discount_amount?: number;
    expires_at?: string;
    is_active?: boolean;
  }): Promise<any> => apiPost<any>('/admin/coupons', payload),
  
  updateCoupon: (code: string, payload: any): Promise<any> =>
    apiPatch<any>(`/admin/coupons/${code}`, payload),

  deleteCoupon: (code: string): Promise<void> =>
    apiDelete<void>(`/admin/coupons/${code}`),

  updateBanner: (id: string, payload: any): Promise<any> =>
    apiPatch<any>(`/admin/banners/${id}`, payload),

  // ======================================================
  // Theme & Platform Configs
  // ======================================================

  getTheme: (): Promise<any> => apiGet<any>('/admin/config/theme'),
  updateTheme: (payload: any): Promise<any> => apiPatch<any>('/admin/config/theme', payload),

  getPlatformConfig: (): Promise<any> => apiGet<any>('/admin/config/platform'),
  updatePlatformConfig: (payload: any): Promise<any> => apiPatch<any>('/admin/config/platform', payload),

  // ======================================================
  // Products
  // ======================================================

  updateProductStock: (productId: string, stock: number): Promise<any> =>
    apiPatch<any>(`/admin/products/${productId}/stock`, { stock }),

  // ======================================================
  // Super Admin Enterprise Overview
  // ======================================================

  getSuperadminOverview: (
    timeframe = '7days',
    startDate?: string,
    endDate?: string
  ): Promise<SuperadminOverviewResponse> => {
    const q = new URLSearchParams();
    if (timeframe) q.set('timeframe', timeframe);
    if (startDate) q.set('start_date', startDate);
    if (endDate) q.set('end_date', endDate);
    return apiGet<SuperadminOverviewResponse>(`/superadmin/overview?${q.toString()}`);
  },

  /** Super Admin Revenue Analytics */
  getRevenueAnalytics: (
    preset = 'this_month',
    dateFrom?: string,
    dateTo?: string,
    dateBasis = 'order_date'
  ): Promise<SuperadminRevenueResponse> => {
    const q = new URLSearchParams();
    if (preset) q.set('preset', preset);
    if (dateFrom) q.set('date_from', dateFrom);
    if (dateTo) q.set('date_to', dateTo);
    if (dateBasis) q.set('date_basis', dateBasis);
    return apiGet<SuperadminRevenueResponse>(`/superadmin/analytics/revenue?${q.toString()}`);
  },

  exportRevenueAnalyticsCsv: async (
    preset = 'this_month',
    dateFrom?: string,
    dateTo?: string,
    dateBasis = 'order_date'
  ): Promise<void> => {
    const q = new URLSearchParams();
    if (preset) q.set('preset', preset);
    if (dateFrom) q.set('date_from', dateFrom);
    if (dateTo) q.set('date_to', dateTo);
    if (dateBasis) q.set('date_basis', dateBasis);
    
    const url = `${BASE_URL}/superadmin/analytics/revenue/export?${q.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to download revenue analytics CSV.');
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `revenue_analytics_${preset}_${dateBasis}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  /** Super Admin Sales Analytics & Ledgers */
  getSalesAnalytics: (params?: {
    preset?: string;
    search?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<ProductSalesPerformanceResponse> => {
    const q = new URLSearchParams();
    if (params?.preset) q.set('preset', params.preset);
    if (params?.search) q.set('search', params.search);
    if (params?.category) q.set('category', params.category);
    if (params?.date_from) q.set('date_from', params.date_from);
    if (params?.date_to) q.set('date_to', params.date_to);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiGet<ProductSalesPerformanceResponse>(`/superadmin/analytics/sales?${q.toString()}`);
  },

  getOnlineSalesLedger: (params?: {
    preset?: string;
    search?: string;
    status?: string;
    payment_method?: string;
    payment_status_filter?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<OnlineLedgerResponse> => {
    const q = new URLSearchParams();
    if (params?.preset) q.set('preset', params.preset);
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    if (params?.payment_method) q.set('payment_method', params.payment_method);
    if (params?.payment_status_filter) q.set('payment_status_filter', params.payment_status_filter);
    if (params?.date_from) q.set('date_from', params.date_from);
    if (params?.date_to) q.set('date_to', params.date_to);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiGet<OnlineLedgerResponse>(`/superadmin/analytics/sales/online?${q.toString()}`);
  },

  getOfflineSalesLedger: (params?: {
    preset?: string;
    search?: string;
    payment_method?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<OfflineLedgerResponse> => {
    const q = new URLSearchParams();
    if (params?.preset) q.set('preset', params.preset);
    if (params?.search) q.set('search', params.search);
    if (params?.payment_method) q.set('payment_method', params.payment_method);
    if (params?.date_from) q.set('date_from', params.date_from);
    if (params?.date_to) q.set('date_to', params.date_to);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiGet<OfflineLedgerResponse>(`/superadmin/analytics/sales/offline?${q.toString()}`);
  },

  exportSalesAnalyticsCsv: async (
    tab: 'products' | 'online' | 'offline' = 'products',
    preset: string = 'this_month',
    search?: string,
    category?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<void> => {
    const q = new URLSearchParams();
    q.set('tab', tab);
    if (preset) q.set('preset', preset);
    if (search) q.set('search', search);
    if (category) q.set('category', category);
    if (dateFrom) q.set('date_from', dateFrom);
    if (dateTo) q.set('date_to', dateTo);

    const url = `${BASE_URL}/superadmin/analytics/sales/export?${q.toString()}`;
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to download sales analytics CSV.');
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `sales_analytics_${tab}_${preset}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  /** Super Admin Admin Management */
  getSuperadminAdmins: (params?: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminListResponse> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.role) q.set('role', params.role);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiGet<AdminListResponse>(`/superadmin/admins?${q.toString()}`);
  },

  getSuperadminAdminById: (adminId: string): Promise<AdminUserRecord> =>
    apiGet<AdminUserRecord>(`/superadmin/admins/${adminId}`),

  createSuperadminAdmin: (payload: {
    full_name: string;
    email: string;
    phone?: string;
    role: string;
    password: string;
    confirm_password: string;
    status: string;
  }): Promise<AdminUserRecord> =>
    apiPost<AdminUserRecord>('/superadmin/admins', payload),

  updateSuperadminAdmin: (
    adminId: string,
    payload: {
      full_name?: string;
      email?: string;
      phone?: string;
      role?: string;
      status?: string;
    }
  ): Promise<AdminUserRecord> =>
    apiPut<AdminUserRecord>(`/superadmin/admins/${adminId}`, payload),

  updateSuperadminAdminStatus: (
    adminId: string,
    status: 'active' | 'inactive'
  ): Promise<AdminUserRecord> =>
    apiPatch<AdminUserRecord>(`/superadmin/admins/${adminId}/status`, { status }),

  updateSuperadminAdminPassword: (
    adminId: string,
    payload: {
      new_password: string;
      confirm_password: string;
    }
  ): Promise<AdminUserRecord> =>
    apiPatch<AdminUserRecord>(`/superadmin/admins/${adminId}/password`, payload),

  deleteSuperadminAdmin: (adminId: string): Promise<{ message: string }> =>
    apiDelete<{ message: string }>(`/superadmin/admins/${adminId}`),

  /** Super Admin Audit Logs */
  getSuperadminAuditLogs: (params?: {
    date_from?: string;
    date_to?: string;
    user_id?: string;
    action?: string;
    module?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<SuperadminAuditLogListResponse> => {
    const q = new URLSearchParams();
    if (params?.date_from) q.set('date_from', params.date_from);
    if (params?.date_to) q.set('date_to', params.date_to);
    if (params?.user_id) q.set('user_id', params.user_id);
    if (params?.action) q.set('action', params.action);
    if (params?.module) q.set('module', params.module);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    return apiGet<SuperadminAuditLogListResponse>(`/superadmin/audit-logs?${q.toString()}`);
  },

  getSuperadminAuditLogById: (logId: string): Promise<SuperadminAuditLogRecord> =>
    apiGet<SuperadminAuditLogRecord>(`/superadmin/audit-logs/${logId}`),

  getAdminAuditLogById: (logId: string): Promise<SuperadminAuditLogRecord> =>
    apiGet<SuperadminAuditLogRecord>(`/superadmin/audit-logs/${logId}`),

  exportSuperadminAuditLogsCsv: async (params?: {
    date_from?: string;
    date_to?: string;
    user_id?: string;
    action?: string;
    module?: string;
    status?: string;
    search?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.date_from) q.set('date_from', params.date_from);
    if (params?.date_to) q.set('date_to', params.date_to);
    if (params?.user_id) q.set('user_id', params.user_id);
    if (params?.action) q.set('action', params.action);
    if (params?.module) q.set('module', params.module);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);

    const url = `${BASE_URL}/superadmin/audit-logs/export?${q.toString()}`;
    const response = await fetch(url, { method: 'GET', credentials: 'include' });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to download audit logs CSV.');
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  /** Superadmin Theme Builder */
  getSuperadminThemes: (): Promise<SuperadminThemeListResponse> =>
    apiGet<SuperadminThemeListResponse>('/superadmin/themes'),

  getSuperadminThemeById: (themeId: string): Promise<SuperadminThemeRecord> =>
    apiGet<SuperadminThemeRecord>(`/superadmin/themes/${themeId}`),

  createSuperadminTheme: (payload: ThemeCreatePayload): Promise<SuperadminThemeRecord> =>
    apiPost<SuperadminThemeRecord>('/superadmin/themes', payload),

  updateSuperadminTheme: (themeId: string, payload: ThemeUpdatePayload): Promise<SuperadminThemeRecord> =>
    apiPut<SuperadminThemeRecord>(`/superadmin/themes/${themeId}`, payload),

  previewSuperadminTheme: (themeId: string): Promise<SuperadminThemeRecord> =>
    apiPost<SuperadminThemeRecord>(`/superadmin/themes/${themeId}/preview`, {}),

  applySuperadminTheme: (themeId: string): Promise<SuperadminThemeRecord> =>
    apiPost<SuperadminThemeRecord>(`/superadmin/themes/${themeId}/apply`, {}),

  resetSuperadminTheme: (): Promise<SuperadminThemeRecord> =>
    apiPost<SuperadminThemeRecord>('/superadmin/themes/reset', {}),

  deleteSuperadminTheme: (themeId: string): Promise<{ message: string }> =>
    apiDelete<{ message: string }>(`/superadmin/themes/${themeId}`),
};

export interface KPICardData {
  current_value: number;
  previous_value: number;
  percentage_change: number;
  comparison_label: string;
}

export interface KPICardWithComparison {
  current_value: number;
  previous_value: number;
  percentage_change: number;
  comparison_label: string;
}

export interface RevenueTrendDataPoint {
  date: string;
  total_revenue: number;
  online_revenue: number;
  cod_collected: number;
  pending_payment: number;
  total_orders: number;
  paid_orders: number;
  cod_orders: number;
  pending_orders: number;
}

export interface PaymentMethodRevenue {
  method: string;
  amount: number;
  percentage: number;
  orders_count: number;
}

export interface TransactionOrderRow {
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  order_date: string;
  payment_date?: string | null;
  amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
}

export interface RevenueSummaryRow {
  date: string;
  total_orders: number;
  paid_orders: number;
  cod_orders: number;
  pending_orders: number;
  total_revenue: number;
  online_revenue: number;
  cod_collected: number;
  pending_payment: number;
  avg_order_value: number;
}

export interface SuperadminRevenueResponse {
  preset: string;
  date_basis: string;
  date_from: string;
  date_to: string;
  display_range: string;
  
  // 8 Primary KPI Cards
  total_revenue: KPICardWithComparison;
  online_revenue: KPICardWithComparison;
  cod_collected: KPICardWithComparison;
  pending_payment: KPICardWithComparison;
  total_orders: KPICardWithComparison;
  paid_orders: KPICardWithComparison;
  cod_orders: KPICardWithComparison;
  pending_orders: KPICardWithComparison;
  
  // Trend Chart
  revenue_trend: RevenueTrendDataPoint[];
  
  // Distributions
  revenue_by_payment_method: PaymentMethodRevenue[];
  
  // Detailed Transactions Table
  transactions: TransactionOrderRow[];
  
  // Detailed Summary Rows
  summary_rows: RevenueSummaryRow[];
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
}

export interface SalesSourceData {
  online_revenue: number;
  online_percentage: number;
  offline_revenue: number;
  offline_percentage: number;
}

export interface TopSellingProductOverview {
  id: string;
  name: string;
  image_url?: string | null;
  units_sold: number;
  revenue: number;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  user_name?: string | null;
}

export interface PaymentMetrics {
  completed: number;
  pending: number;
  cancelled: number;
}

export interface SuperadminOverviewResponse {
  total_revenue: KPICardData;
  total_orders: KPICardData;
  online_orders?: KPICardData;
  offline_orders?: KPICardData;
  total_customers: KPICardData;
  active_admins: KPICardData;
  payment_metrics?: PaymentMetrics | null;
  revenue_trend: RevenueTrendPoint[];
  sales_source: SalesSourceData;
  top_selling_products: TopSellingProductOverview[];
  recent_activities: RecentActivityItem[];
}

export interface SalesMetricCard {
  current_value: number;
  previous_value: number;
  percentage_change: number;
  comparison_label: string;
}

export interface SalesKPICard {
  total_orders: SalesMetricCard;
  total_units_sold: SalesMetricCard;
  online_orders: SalesMetricCard;
  online_units_sold: SalesMetricCard;
  offline_orders: SalesMetricCard;
  offline_units_sold: SalesMetricCard;
  pending_orders: SalesMetricCard;
  cancelled_orders: SalesMetricCard;
  current_stock: SalesMetricCard;
  low_stock_products: SalesMetricCard;
}

export interface SalesTrendPoint {
  date: string;
  total_orders: number;
  online_orders: number;
  offline_orders: number;
  total_units: number;
  online_units: number;
  offline_units: number;
}

export interface InventorySummary {
  current_stock: number;
  sold_quantity: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_catalog_products: number;
}

export interface ProductSalesPerformanceItem {
  id: string;
  name: string;
  category_name: string;
  image_url?: string | null;
  price: number;
  units_sold: number;
  online_units: number;
  offline_units: number;
  current_stock: number;
}

export interface ProductSalesPerformanceResponse {
  preset: string;
  date_from: string;
  date_to: string;
  display_range: string;
  kpis: SalesKPICard;
  sales_trend: SalesTrendPoint[];
  inventory_summary: InventorySummary;
  products: ProductSalesPerformanceItem[];
  total_products: number;
  page: number;
  limit: number;
}

export interface OnlineLedgerItem {
  id: string;
  order_id: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  product_summary: string;
  quantity: number;
  payment_method: string;
  amount: number;
  order_status: string;
  payment_status?: string;
  subtotal?: number;
  discount?: number;
  delivery_option?: string;
  shipping_address?: any;
}

export interface OnlineLedgerResponse {
  items: OnlineLedgerItem[];
  total: number;
  page: number;
  limit: number;
}

export interface OfflineLedgerItem {
  id: string;
  receipt_id: string;
  created_at: string;
  product_name: string;
  quantity: number;
  payment_method: string;
  amount: number;
  customer_name?: string;
  phone?: string;
}

export interface OfflineLedgerResponse {
  items: OfflineLedgerItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserRecord {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: string;
  is_active: boolean;
  status: string;
  created_at: string;
  last_login_at?: string | null;
}

export interface AdminListResponse {
  items: AdminUserRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface SuperadminAuditLogRecord {
  id: string;
  user_id?: string | null;
  user_name: string;
  user_email?: string | null;
  user_role: string;
  action: string;
  module?: string;
  entity_type?: string | null;
  entity_id?: string | null;
  ip_address?: string;
  user_agent?: string | null;
  request_method?: string;
  endpoint?: string;
  status: string;
  details?: string | null;
  description?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

export interface SuperadminAuditLogListResponse {
  items: SuperadminAuditLogRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface SuperadminThemeRecord {
  id: string;
  name: string;
  description?: string | null;
  primary_brand_color: string;
  background_color: string;
  luxury_gold_color: string;
  secondary_accent_color: string;
  text_color: string;
  surface_color: string;
  is_active: boolean;
  is_preset: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface SuperadminThemeListResponse {
  items: SuperadminThemeRecord[];
  active_theme_id?: string | null;
}

export interface ThemeCreatePayload {
  name: string;
  description?: string;
  primary_brand_color: string;
  background_color: string;
  luxury_gold_color: string;
  secondary_accent_color: string;
  text_color: string;
  surface_color: string;
}

export interface ThemeUpdatePayload {
  name?: string;
  description?: string;
  primary_brand_color: string;
  background_color: string;
  luxury_gold_color: string;
  secondary_accent_color: string;
  text_color: string;
  surface_color: string;
}


// ─── Platform Settings ───────────────────────────────────────────────────────

export interface PlatformSettingsRecord {
  id: string;

  // Store Config
  store_front_name: string;
  support_email: string;
  support_phone: string;
  store_address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  base_currency: string;
  timezone: string;
  business_status: string;

  // Payment & Shipping
  cod_enabled: boolean;
  gst_rate: number;
  platform_fee: number;
  standard_shipping_charge: number;
  free_shipping_min_order: number;
  maximum_cod_order_value: number;

  // Customer & Order
  customer_registration_enabled: boolean;
  guest_checkout_enabled: boolean;
  minimum_order_value: number;
  order_cancellation_enabled: boolean;
  cancellation_time_limit: number;
  return_refund_enabled: boolean;

  // System & Security
  maintenance_mode: boolean;
  admin_session_timeout: number;
  max_login_attempts: number;
  account_lockout_duration: number;

  updated_at: string;
  updated_by?: string | null;
}

export type PlatformSettingsUpdatePayload = Omit<
  PlatformSettingsRecord,
  'id' | 'updated_at' | 'updated_by'
>;

export interface MaintenanceModeResponse {
  maintenance_mode: boolean;
  message: string;
}

// Extend adminService object
Object.assign(adminService, {
  getPlatformSettings: (): Promise<PlatformSettingsRecord> =>
    apiGet<PlatformSettingsRecord>('/superadmin/platform-settings'),

  updatePlatformSettings: (payload: PlatformSettingsUpdatePayload): Promise<PlatformSettingsRecord> =>
    apiPut<PlatformSettingsRecord>('/superadmin/platform-settings', payload),

  toggleMaintenanceMode: (enable: boolean): Promise<MaintenanceModeResponse> =>
    apiPost<MaintenanceModeResponse>('/superadmin/platform-settings/maintenance-mode', {
      enable,
      confirmed: true,
    }),

  resetPlatformSettings: (): Promise<PlatformSettingsRecord> =>
    apiPost<PlatformSettingsRecord>('/superadmin/platform-settings/reset', {}),
});


// ─── Superadmin Notifications ────────────────────────────────────────────────

export interface SuperadminNotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'SECURITY' | 'ADMIN_MANAGEMENT' | 'PLATFORM_SYSTEM' | 'BUSINESS';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  is_read: boolean;
  read_at?: string | null;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  related_user_id?: string | null;
  related_user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  created_at: string;
}

export interface SuperadminNotificationListResponse {
  items: SuperadminNotificationItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  unread_count: number;
}

export interface SuperadminNotificationQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  severity?: string;
  is_read?: boolean;
  date_from?: string;
  date_to?: string;
  search?: string;
}

Object.assign(adminService, {
  getSuperadminNotifications: (
    params?: SuperadminNotificationQueryParams
  ): Promise<SuperadminNotificationListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.category) query.append('category', params.category);
    if (params?.severity) query.append('severity', params.severity);
    if (params?.is_read !== undefined) query.append('is_read', params.is_read.toString());
    if (params?.date_from) query.append('date_from', params.date_from);
    if (params?.date_to) query.append('date_to', params.date_to);
    if (params?.search) query.append('search', params.search);

    const qStr = query.toString();
    return apiGet<SuperadminNotificationListResponse>(
      `/superadmin/notifications${qStr ? `?${qStr}` : ''}`
    );
  },

  getSuperadminUnreadCount: (): Promise<{ unread_count: number }> =>
    apiGet<{ unread_count: number }>('/superadmin/notifications/unread-count'),

  getSuperadminNotificationById: (
    id: string
  ): Promise<SuperadminNotificationItem> =>
    apiGet<SuperadminNotificationItem>(`/superadmin/notifications/${id}`),

  markSuperadminNotificationAsRead: (
    id: string
  ): Promise<SuperadminNotificationItem> =>
    apiPatch<SuperadminNotificationItem>(`/superadmin/notifications/${id}/read`, {}),

  markAllSuperadminNotificationsAsRead: (): Promise<{ unread_count: number }> =>
    apiPatch<{ unread_count: number }>('/superadmin/notifications/read-all', {}),

  deleteSuperadminNotification: (
    id: string
  ): Promise<{ message: string }> =>
    apiDelete<{ message: string }>(`/superadmin/notifications/${id}`),
});

