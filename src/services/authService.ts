/**
 * Auth Service — handles login, register, logout, OTP, forgot-password, and session refresh.
 *
 * Auth Strategy:
 *   - The backend sets httpOnly cookies (access_token, refresh_token) on login/register.
 *   - All API calls use credentials: 'include' so cookies are sent automatically.
 *   - No manual token storage or Bearer header is needed.
 *   - No demo mode, no localStorage auth fallbacks.
 */

import { apiGet, apiPost, setAuthToken, setRefreshToken, getRefreshToken, clearTokens } from '../lib/api';
import type {
  User,
  AuthResponse,
  SendOtpResponse,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  ResetPasswordPayload,
  StaffCheckMobilePayload,
  StaffCheckMobileResponse,
  StaffLoginPayload,
  IdentifyPayload,
  IdentifyResponse,
} from '../types';

export const authService = {
  /**
   * Unified Single Login: Validate mobile number and determine next authentication step (OTP or Password).
   * Sends country_code and mobile_number as separate fields: { country_code: '+91', mobile_number: '8074182784' }.
   */
  identify: async (payloadOrNumber: string | IdentifyPayload): Promise<IdentifyResponse> => {
    const payload = typeof payloadOrNumber === 'string'
      ? { country_code: '+91', mobile_number: payloadOrNumber }
      : {
          country_code: payloadOrNumber.country_code || '+91',
          mobile_number: payloadOrNumber.mobile_number || payloadOrNumber.phone || '',
        };
    return apiPost<IdentifyResponse>('/auth/identify', payload);
  },

  /**
   * Customer OTP: Step 1 — Send OTP to customer mobile number (MSG91).
   */
  sendCustomerOtp: async (phone: string): Promise<SendOtpResponse> => {
    return apiPost<SendOtpResponse>('/auth/customer/send-otp', { phone });
  },

  /**
   * Customer OTP: Resend OTP to customer mobile number.
   */
  resendCustomerOtp: async (phone: string): Promise<SendOtpResponse> => {
    return apiPost<SendOtpResponse>('/auth/customer/resend-otp', { phone });
  },

  /**
   * Customer OTP: Step 2 — Verify OTP. Auto-creates customer account if new.
   */
  verifyCustomerOtp: async (phone: string, otp: string): Promise<AuthResponse> => {
    const res = await apiPost<AuthResponse>('/auth/customer/verify-otp', { phone, otp });
    if (res?.access_token) {
      setAuthToken(res.access_token);
    }
    if (res?.refresh_token) {
      setRefreshToken(res.refresh_token);
    }
    return res;
  },

  /**
   * Staff Auth: Step 1 — Validate active staff account exists for mobile & role.
   */
  checkStaffMobile: async (payload: StaffCheckMobilePayload): Promise<StaffCheckMobileResponse> => {
    return apiPost<StaffCheckMobileResponse>('/auth/staff/check-mobile', payload);
  },

  /**
   * Staff Auth: Step 2 — Authenticate staff with password and verify role.
   */
  staffLogin: async (payload: StaffLoginPayload): Promise<AuthResponse> => {
    const res = await apiPost<AuthResponse>('/auth/staff/login', payload);
    if (res?.access_token) {
      setAuthToken(res.access_token);
    }
    if (res?.refresh_token) {
      setRefreshToken(res.refresh_token);
    }
    return res;
  },



  /**
   * Forgot password — sends reset OTP to email or mobile number.
   */
  forgotPassword: async (identifierOrPayload: string | ForgotPasswordPayload): Promise<ForgotPasswordResponse> => {
    let payload: ForgotPasswordPayload;
    if (typeof identifierOrPayload === 'string') {
      const isEmail = identifierOrPayload.includes('@');
      payload = isEmail ? { email: identifierOrPayload.trim() } : { phone: identifierOrPayload.replace(/\D/g, '').slice(-10) };
    } else {
      payload = identifierOrPayload;
    }
    return apiPost<ForgotPasswordResponse>('/auth/forgot-password', payload);
  },

  /**
   * Resend forgot-password OTP.
   */
  resendForgotOtp: async (identifierOrPayload: string | ForgotPasswordPayload): Promise<ForgotPasswordResponse> => {
    let payload: ForgotPasswordPayload;
    if (typeof identifierOrPayload === 'string') {
      const isEmail = identifierOrPayload.includes('@');
      payload = isEmail ? { email: identifierOrPayload.trim() } : { phone: identifierOrPayload.replace(/\D/g, '').slice(-10) };
    } else {
      payload = identifierOrPayload;
    }
    return apiPost<ForgotPasswordResponse>('/auth/resend-forgot-otp', payload);
  },

  /**
   * Reset password using OTP token.
   */
  resetPassword: async (
    identifierOrPayload: string | { email?: string; phone?: string },
    otp: string,
    password: string,
    confirmPassword: string
  ): Promise<{ message: string }> => {
    const body: Record<string, string> = {
      otp: otp.trim(),
      password,
      confirm_password: confirmPassword,
    };
    if (typeof identifierOrPayload === 'string') {
      if (identifierOrPayload.includes('@')) {
        body.email = identifierOrPayload.trim();
      } else {
        body.phone = identifierOrPayload.replace(/\D/g, '').slice(-10);
      }
    } else {
      if (identifierOrPayload.email) body.email = identifierOrPayload.email.trim();
      if (identifierOrPayload.phone) body.phone = identifierOrPayload.phone.replace(/\D/g, '').slice(-10);
    }
    return apiPost<{ message: string }>('/auth/reset-password', body);
  },

  /**
   * Change password (authenticated user).
   */
  changePassword: async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ message: string }> => {
    return apiPost<{ message: string }>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
  },

  /**
   * Send OTP for authenticated password update.
   */
  sendUpdatePasswordOTP: async (email: string): Promise<{ message: string }> => {
    return apiPost<{ message: string }>('/auth/update-password/send-otp', { email });
  },

  /**
   * Verify OTP for authenticated password update.
   */
  verifyUpdatePasswordOTP: async (email: string, otp: string): Promise<{ message: string }> => {
    return apiPost<{ message: string }>('/auth/update-password/verify-otp', { email, otp });
  },

  /**
   * Update password after OTP verification.
   */
  updatePasswordWithOTP: async (
    email: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ message: string }> => {
    return apiPost<{ message: string }>('/auth/update-password', {
      email,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
  },



  /**
   * Logout — clears server-side session (cookie) and client auth tokens.
   */
  logout: async (): Promise<void> => {
    clearTokens();
    try {
      await apiPost<void>('/auth/logout');
    } catch {
      // Best-effort: even if server logout fails, the cookie and client token will clear
    }
  },

  /**
   * Refresh access token using the httpOnly refresh cookie and/or stored refresh token.
   * The backend replaces both cookies on success and returns new tokens in response.
   */
  refreshToken: async (): Promise<{ message: string; access_token?: string; refresh_token?: string }> => {
    const storedRefreshToken = getRefreshToken();
    const res = await apiPost<{ message: string; access_token?: string; refresh_token?: string }>('/auth/refresh', {
      refresh_token: storedRefreshToken,
    });
    if (res?.access_token) {
      setAuthToken(res.access_token);
    }
    if (res?.refresh_token) {
      setRefreshToken(res.refresh_token);
    }
    return res;
  },

  /**
   * Fetch authenticated user's profile.
   * Uses httpOnly cookie session with Bearer header fallback.
   * Returns null-equivalent if not authenticated (401 redirects to /login).
   */
  getMe: async (): Promise<User> => {
    try {
      return await apiGet<User>('/auth/me');
    } catch {
      return await apiGet<User>('/users/me');
    }
  },
};
