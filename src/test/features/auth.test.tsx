import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../../features/auth/LoginPage';
import { ForgotPasswordPage } from '../../features/auth/ForgotPasswordPage';
import { authService } from '../../services/authService';

// Mock useApp
const mockCustomerOtpLogin = vi.fn();
const mockStaffLogin = vi.fn();

vi.mock('../../app/providers', () => ({
  useApp: () => ({
    customerOtpLogin: mockCustomerOtpLogin,
    staffLogin: mockStaffLogin,
    role: 'guest',
  }),
}));

vi.mock('../../services/authService', () => ({
  authService: {
    identify: vi.fn(),
    sendCustomerOtp: vi.fn(),
    resendCustomerOtp: vi.fn(),
    verifyCustomerOtp: vi.fn(),
    checkStaffMobile: vi.fn(),
    staffLogin: vi.fn(),
    forgotPassword: vi.fn(),
    resendForgotOtp: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

describe('Unified LoginPage Component and Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders unified mobile number login form with header and back button', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText('BACK TO STORE')).toBeInTheDocument();
    expect(screen.getByText('PREMIUM CHOCOLATES')).toBeInTheDocument();
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Enter your mobile number to continue')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter mobile number')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CONTINUE/i })).toBeInTheDocument();
  });

  it('validates mobile number input and displays error when invalid number is submitted', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Enter mobile number');
    fireEvent.change(input, { target: { value: '123' } });

    const continueBtn = screen.getByRole('button', { name: /CONTINUE/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid 10-digit Indian mobile number.')).toBeInTheDocument();
    });
    expect(authService.identify).not.toHaveBeenCalled();
  });

  it('identifies customer and transitions to OTP step', async () => {
    vi.mocked(authService.identify).mockResolvedValueOnce({
      next_step: 'otp',
      message: 'OTP sent to your mobile number via SMS.',
      phone: '9876543210',
      expires_in: 300,
      resend_cooldown: 60,
      remaining_daily_requests: 4,
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Enter mobile number');
    fireEvent.change(input, { target: { value: '9876543210' } });

    const continueBtn = screen.getByRole('button', { name: /CONTINUE/i });
    expect(continueBtn).toBeEnabled();
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(authService.identify).toHaveBeenCalledWith({ country_code: '+91', mobile_number: '9876543210' });
      expect(screen.getByText('Verify OTP')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /VERIFY & LOGIN/i })).toBeInTheDocument();
    });
  });

  it('identifies staff and transitions to Password step', async () => {
    vi.mocked(authService.identify).mockResolvedValueOnce({
      next_step: 'password',
      message: 'Staff account recognized. Please enter your password.',
      phone: '9876543210',
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Enter mobile number');
    fireEvent.change(input, { target: { value: '9876543210' } });

    const continueBtn = screen.getByRole('button', { name: /CONTINUE/i });
    expect(continueBtn).toBeEnabled();
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(authService.identify).toHaveBeenCalledWith({ country_code: '+91', mobile_number: '9876543210' });
      expect(screen.getByText('Staff Sign In')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /SIGN IN/i })).toBeInTheDocument();
      const forgotLink = screen.getByRole('link', { name: /Forgot Password\?/i });
      expect(forgotLink).toBeInTheDocument();
      expect(forgotLink).toHaveAttribute('href', '/forgot-password?phone=9876543210');
    });
  });

  it('does not render forgot password link on initial mobile phone step', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const forgotLink = screen.queryByRole('link', { name: /Forgot your password\?/i });
    expect(forgotLink).not.toBeInTheDocument();
  });
});

describe('ForgotPasswordPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders reset password form with pre-filled phone from URL search params', () => {
    render(
      <MemoryRouter initialEntries={['/forgot-password?phone=9876543210']}>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByText('BACK TO LOGIN')).toBeInTheDocument();
    const backToSignInLinks = screen.getAllByRole('link', { name: /Back to Sign In/i });
    expect(backToSignInLinks.length).toBeGreaterThan(0);
    expect(backToSignInLinks[0]).toHaveAttribute('href', '/login');
    const input = screen.getByPlaceholderText('e.g. 9876543210 or staff@chovique.com') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('9876543210');
    expect(screen.getByRole('button', { name: /SEND RESET CODE/i })).toBeInTheDocument();
  });

  it('submits forgot password request with mobile number and transitions to OTP step', async () => {
    vi.mocked(authService.forgotPassword).mockResolvedValueOnce({
      message: 'If an active staff account exists for this mobile number, an OTP has been sent.',
      expires_in: 300,
    });

    render(
      <MemoryRouter initialEntries={['/forgot-password']}>
        <ForgotPasswordPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('e.g. 9876543210 or staff@chovique.com');
    fireEvent.change(input, { target: { value: '9876543210' } });

    const sendBtn = screen.getByRole('button', { name: /SEND RESET CODE/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(authService.forgotPassword).toHaveBeenCalledWith('9876543210');
      expect(screen.getByText('Verify & Set Password')).toBeInTheDocument();
      expect(screen.getByText('Enter the 6-digit code sent to +91 9876543210')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /UPDATE PASSWORD & SIGN IN/i })).toBeInTheDocument();
      const resetBackLinks = screen.getAllByRole('link', { name: /Back to Sign In/i });
      expect(resetBackLinks.length).toBeGreaterThan(0);
      expect(resetBackLinks[0]).toHaveAttribute('href', '/login');
    });
  });
});
