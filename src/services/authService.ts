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
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  SendOtpPayload,
  VerifyOtpPayload,
  SendOtpResponse,
  GoogleAuthResponse,
  ForgotPasswordResponse,
} from '../types';

export const authService = {
  /**
   * Login — POST /auth/login.
   * Backend sets httpOnly access + refresh cookies on success and returns tokens.
   */
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const res = await apiPost<AuthResponse>('/auth/login', {
      email: payload.email,
      password: payload.password,
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
   * Register — Step 1: POST /auth/register.
   * Sends OTP to the user's email. No account is created at this point.
   */
  register: async (payload: RegisterPayload): Promise<SendOtpResponse> => {
    return apiPost<SendOtpResponse>('/auth/register', {
      full_name: payload.name,
      email: payload.email,
      password: payload.password,
      confirm_password: payload.confirmPassword,
    });
  },

  /**
   * Send OTP — alias for register step (backend sends OTP on /auth/register).
   */
  sendOtp: async (payload: SendOtpPayload): Promise<SendOtpResponse> => {
    return apiPost<SendOtpResponse>('/auth/register', {
      full_name: payload.name,
      email: payload.email,
      password: payload.password,
      confirm_password: payload.confirmPassword,
    });
  },

  /**
   * Verify 6-digit OTP and complete registration.
   * Backend sets auth cookies and returns the created User.
   */
  verifyOtp: async (payload: VerifyOtpPayload): Promise<AuthResponse> => {
    const res = await apiPost<AuthResponse>('/auth/verify-otp', {
      email: payload.email,
      otp: payload.otp,
      full_name: payload.fullName,
      password: payload.password,
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
   * Resend registration OTP.
   */
  resendOtp: async (email: string): Promise<SendOtpResponse> => {
    return apiPost<SendOtpResponse>('/auth/resend-otp', { email });
  },

  /**
   * Forgot password — sends reset OTP to email.
   */
  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    return apiPost<ForgotPasswordResponse>('/auth/forgot-password', { email });
  },


  /**
   * Resend forgot-password OTP.
   */
  resendForgotOtp: async (email: string): Promise<ForgotPasswordResponse> => {
    return apiPost<ForgotPasswordResponse>('/auth/resend-forgot-otp', { email });
  },

  /**
   * Reset password using OTP token.
   */
  resetPassword: async (
    email: string,
    otp: string,
    password: string,
    confirmPassword: string
  ): Promise<{ message: string }> => {
    return apiPost<{ message: string }>('/auth/reset-password', {
      email,
      otp,
      password,
      confirm_password: confirmPassword,
    });
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
   * Google Sign-In — exchange a Google id_token for a Chovique session.
   */
  googleSignIn: async (idToken: string): Promise<GoogleAuthResponse> => {
    const res = await apiPost<GoogleAuthResponse>('/auth/google', { id_token: idToken });
    if (res?.access_token) {
      setAuthToken(res.access_token);
    }
    if (res?.refresh_token) {
      setRefreshToken(res.refresh_token);
    }
    return res;
  },

  /**
   * Set password for OAuth / Google users who don't have a password yet — POST /auth/set-password.
   */
  setPassword: async (password: string, confirmPassword: string): Promise<AuthResponse> => {
    const res = await apiPost<AuthResponse>('/auth/set-password', {
      password,
      confirm_password: confirmPassword,
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
    return apiGet<User>('/users/me');
  },
};
