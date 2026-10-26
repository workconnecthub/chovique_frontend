import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../../app/providers';
import { authService } from '../../services/authService';
import { ApiError } from '../../lib/api';
import { isSuperAdminRole, isAdminRole } from '../../types';

export function getSafeReturnUrl(target: unknown): string {
  if (typeof target !== 'string' || !target.trim()) return '/';
  const trimmed = target.trim();
  if (/^\/[^/\\]/.test(trimmed) || trimmed === '/') {
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
      return trimmed;
    }
  }
  return '/';
}

function sanitizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits.slice(-10);
}

export const LoginPage: React.FC = () => {
  const { customerOtpLogin, staffLogin } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as { from?: string } | undefined;
  const searchParams = new URLSearchParams(location.search);
  const rawTarget = searchParams.get('returnUrl') || searchParams.get('redirect') || locationState?.from;
  const returnUrl = getSafeReturnUrl(rawTarget);

  // Authentication Flow State: 'PHONE' -> 'OTP' (Customer) or 'PASSWORD' (Staff)
  const [currentStep, setCurrentStep] = useState<'PHONE' | 'OTP' | 'PASSWORD'>('PHONE');

  // Input fields
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [remainingDailyRequests, setRemainingDailyRequests] = useState<number | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // ===========================================================================
  // STEP 1: IDENTIFY MOBILE NUMBER
  // ===========================================================================
  const handleIdentifyMobile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const clean = sanitizePhone(phone);
    if (!clean || clean.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setErrorMessage('Mobile number must start with 6, 7, 8, or 9.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.identify({
        country_code: countryCode,
        mobile_number: clean,
      });
      if (res.remaining_daily_requests !== undefined) {
        setRemainingDailyRequests(res.remaining_daily_requests);
      }

      if (res.next_step === 'otp') {
        // Customer flow
        setCurrentStep('OTP');
        setCooldown(res.resend_cooldown || 60);
        setSuccessMessage(`OTP sent to ${res.country_code || countryCode} ${clean}`);
      } else if (res.next_step === 'password') {
        // Staff flow
        setCurrentStep('PASSWORD');
      } else {
        setErrorMessage('Unable to determine login flow. Please try again.');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to connect to authentication server. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ===========================================================================
  // STEP 2A: CUSTOMER VERIFY OTP
  // ===========================================================================
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanPhone = sanitizePhone(phone);
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Please enter the 6-digit numeric verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await customerOtpLogin(cleanPhone, cleanOtp);
      if (result.success) {
        navigate(returnUrl, { replace: true });
      } else {
        setErrorMessage(result.error || 'Invalid OTP code. Please check and try again.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || isLoading) return;
    setErrorMessage('');
    setSuccessMessage('');

    const cleanPhone = sanitizePhone(phone);
    setIsLoading(true);
    try {
      const res = await authService.resendCustomerOtp(cleanPhone);
      setCooldown(60);
      setSuccessMessage('A fresh OTP has been sent to your mobile number.');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.detail);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to resend OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ===========================================================================
  // STEP 2B: STAFF PASSWORD LOGIN
  // ===========================================================================
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanPhone = sanitizePhone(phone);
    if (!password.trim()) {
      setErrorMessage('Please enter your staff account password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await staffLogin(cleanPhone, password.trim());
      if (result.success) {
        const userRole = String(result.user?.role || result.role || '');
        if (isSuperAdminRole(userRole)) {
          navigate('/superadmin', { replace: true });
        } else if (isAdminRole(userRole)) {
          navigate('/admin', { replace: true });
        } else if (userRole === 'delivery_boy' || userRole === 'delivery_person') {
          navigate('/delivery', { replace: true });
        } else {
          navigate('/admin', { replace: true });
        }
      } else {
        setErrorMessage(result.error || 'Invalid credentials or inactive account.');
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Return to Mobile Step
  const handleBackToMobile = () => {
    setCurrentStep('PHONE');
    setOtp('');
    setPassword('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#090706',
        backgroundImage:
          'radial-gradient(ellipse at 50% 40%, rgba(46, 32, 18, 0.65) 0%, rgba(16, 12, 10, 0.95) 70%, #080605 100%)',
        padding: '24px 16px',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Background Circular Geometric Emblem Watermark */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '680px',
          height: '680px',
          backgroundImage: 'url(/assets/dashboard-watermark.png)',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-outset',
          opacity: 0.12,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top Left "BACK TO STORE" Button */}
      <div
        style={{
          position: 'absolute',
          top: '28px',
          left: '28px',
          zIndex: 10,
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '9999px',
            background: 'rgba(18, 14, 11, 0.65)',
            border: '1px solid rgba(212, 175, 55, 0.65)',
            color: '#ECC56C',
            fontSize: '0.78rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textDecoration: 'none',
            textTransform: 'uppercase',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#ECC56C';
            e.currentTarget.style.boxShadow = '0 0 16px rgba(236, 197, 108, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.65)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
          }}
        >
          <ArrowLeft size={14} color="#ECC56C" />
          <span>BACK TO STORE</span>
        </Link>
      </div>

      {/* Top Brand Header: Cocoa Pod Icon + CHOVIQUE + PREMIUM CHOCOLATES */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '28px',
        }}
      >
        {/* Cocoa Pod Geometric Emblem SVG */}
        <div style={{ marginBottom: '10px' }}>
          <svg
            width="52"
            height="52"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: 'drop-shadow(0 0 10px rgba(236, 197, 108, 0.3))' }}
          >
            {/* Cocoa Pod Outline */}
            <path
              d="M32 6C20 6 12 18 12 32C12 46 22 58 32 58C42 58 52 46 52 32C52 18 44 6 32 6Z"
              stroke="#ECC56C"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Pod Flutes */}
            <path
              d="M32 6V58M23 11C18 20 18 44 23 53M41 11C46 20 46 44 41 53"
              stroke="#ECC56C"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="2 3"
            />
            {/* Leaf details on top */}
            <path
              d="M32 6C30 2 36 -1 42 2C42 8 36 6 32 6Z"
              stroke="#ECC56C"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="rgba(236, 197, 108, 0.15)"
            />
          </svg>
        </div>

        {/* Brand Name */}
        <h1
          style={{
            margin: 0,
            fontFamily: "'Playfair Display', 'Cinzel', serif",
            fontSize: '1.85rem',
            letterSpacing: '0.28em',
            color: '#ECC56C',
            fontWeight: 600,
            textTransform: 'uppercase',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.7)',
          }}
        >
          C H O V I Q U E
        </h1>

        {/* Sub-label */}
        <span
          style={{
            marginTop: '4px',
            fontSize: '0.68rem',
            letterSpacing: '0.32em',
            color: '#C9A84C',
            fontWeight: 500,
            textTransform: 'uppercase',
          }}
        >
          PREMIUM CHOCOLATES
        </span>
      </div>

      {/* Center Gold-Outlined Login Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '470px',
          background: 'rgba(16, 12, 9, 0.92)',
          border: '1.5px solid rgba(212, 175, 55, 0.78)',
          borderRadius: '24px',
          padding: '40px 36px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(212, 175, 55, 0.12)',
          backdropFilter: 'blur(16px)',
          boxSizing: 'border-box',
        }}
      >
        {/* Card Heading */}
        <div style={{ textAlign: 'center', marginBottom: '26px' }}>
          <h2
            style={{
              margin: '0 0 8px 0',
              fontFamily: "'Playfair Display', 'Cinzel', serif",
              fontSize: '2.1rem',
              fontWeight: 600,
              color: '#F9F6F0',
              letterSpacing: '-0.01em',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
            }}
          >
            {currentStep === 'PHONE' && 'Welcome Back'}
            {currentStep === 'OTP' && 'Verify OTP'}
            {currentStep === 'PASSWORD' && 'Staff Sign In'}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: '0.92rem',
              color: '#A09B94',
              lineHeight: 1.5,
            }}
          >
            {currentStep === 'PHONE' && 'Enter your mobile number to continue'}
            {currentStep === 'OTP' && `Enter the 6-digit code sent to +91 ${sanitizePhone(phone)}`}
            {currentStep === 'PASSWORD' && `Enter your password for +91 ${sanitizePhone(phone)}`}
          </p>
        </div>

        {/* Global Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: 'rgba(231, 76, 60, 0.14)',
              border: '1px solid rgba(231, 76, 60, 0.65)',
              color: '#FF7B7B',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '0.86rem',
              marginBottom: '20px',
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Global Success Alert */}
        {successMessage && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(46, 204, 113, 0.14)',
              border: '1px solid rgba(46, 204, 113, 0.65)',
              color: '#34D399',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '0.86rem',
              marginBottom: '20px',
              lineHeight: 1.4,
            }}
          >
            <CheckCircle2 size={17} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 1: MOBILE NUMBER INPUT                                         */}
        {/* =================================================================== */}
        {currentStep === 'PHONE' && (
          <form onSubmit={handleIdentifyMobile} noValidate>
            <div style={{ marginBottom: '22px' }}>
              <label
                htmlFor="mobile-input"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  color: '#EDEDED',
                  marginBottom: '8px',
                }}
              >
                Mobile Number <span style={{ color: '#EF4444' }}>*</span>
              </label>

              {/* Input container matching reference image */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.55)',
                  border: '1.2px solid rgba(212, 175, 55, 0.5)',
                  borderRadius: '12px',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
                  transition: 'all 0.2s ease',
                  overflow: 'hidden',
                }}
              >
                {/* Left section: Flag + Code + Dropdown icon */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '13px 14px',
                    borderRight: '1px solid rgba(255, 255, 255, 0.12)',
                    userSelect: 'none',
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  {/* Indian Flag Emoji */}
                  <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>🇮🇳</span>
                  <span
                    style={{
                      color: '#EDEDED',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                    }}
                  >
                    {countryCode}
                  </span>
                  <ChevronDown size={14} color="#9CA3AF" />
                </div>

                {/* Right input */}
                <input
                  id="mobile-input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="Enter mobile number"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(digits);
                    if (errorMessage) setErrorMessage('');
                  }}
                  disabled={isLoading}
                  autoFocus
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: '13px 16px',
                    color: '#FFFFFF',
                    fontSize: '0.96rem',
                    letterSpacing: '0.04em',
                    fontWeight: 400,
                  }}
                />
              </div>
            </div>

            {/* CONTINUE Button */}
            <button
              type="submit"
              disabled={isLoading || !phone.trim()}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                border: 'none',
                background:
                  !phone.trim() || isLoading
                    ? 'rgba(212, 175, 55, 0.35)'
                    : 'linear-gradient(135deg, #F3D079 0%, #E5B842 50%, #C89624 100%)',
                color: !phone.trim() || isLoading ? 'rgba(0, 0, 0, 0.5)' : '#0A0805',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                cursor: !phone.trim() || isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow:
                  !phone.trim() || isLoading
                    ? 'none'
                    : '0 6px 20px rgba(229, 184, 66, 0.35)',
              }}
              onMouseEnter={(e) => {
                if (phone.trim() && !isLoading) {
                  e.currentTarget.style.filter = 'brightness(1.08)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>VERIFYING...</span>
                </>
              ) : (
                <span>CONTINUE →</span>
              )}
            </button>
          </form>
        )}

        {/* =================================================================== */}
        {/* STEP 2A: CUSTOMER OTP VERIFICATION                                  */}
        {/* =================================================================== */}
        {currentStep === 'OTP' && (
          <form onSubmit={handleVerifyOtp} noValidate>
            {/* Phone Summary & Change button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1rem' }}>🇮🇳</span>
                <span style={{ color: '#ECC56C', fontWeight: 600, fontSize: '0.94rem' }}>
                  +91 {sanitizePhone(phone)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleBackToMobile}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9CA3AF',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Change Number
              </button>
            </div>

            {/* OTP Input */}
            <div style={{ marginBottom: '22px' }}>
              <label
                htmlFor="otp-input"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  color: '#EDEDED',
                  marginBottom: '8px',
                }}
              >
                6-Digit OTP Code <span style={{ color: '#EF4444' }}>*</span>
              </label>

              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="• • • • • •"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(val);
                  if (errorMessage) setErrorMessage('');
                }}
                disabled={isLoading}
                autoFocus
                style={{
                  width: '100%',
                  height: '52px',
                  background: 'rgba(0, 0, 0, 0.55)',
                  border: '1.2px solid rgba(212, 175, 55, 0.65)',
                  borderRadius: '12px',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
                  color: '#ECC56C',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  letterSpacing: '0.35em',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isLoading || otp.trim().length !== 6}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                border: 'none',
                background:
                  otp.trim().length !== 6 || isLoading
                    ? 'rgba(212, 175, 55, 0.35)'
                    : 'linear-gradient(135deg, #F3D079 0%, #E5B842 50%, #C89624 100%)',
                color: otp.trim().length !== 6 || isLoading ? 'rgba(0, 0, 0, 0.5)' : '#0A0805',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                cursor: otp.trim().length !== 6 || isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow:
                  otp.trim().length !== 6 || isLoading
                    ? 'none'
                    : '0 6px 20px rgba(229, 184, 66, 0.35)',
                marginBottom: '16px',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>VERIFYING OTP...</span>
                </>
              ) : (
                <span>VERIFY &amp; LOGIN →</span>
              )}
            </button>

            {/* Resend Action & Daily limit info */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.84rem',
              }}
            >
              {cooldown > 0 ? (
                <span style={{ color: '#9CA3AF' }}>
                  Resend OTP in <strong style={{ color: '#ECC56C' }}>{cooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ECC56C',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px',
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Resend OTP</span>
                </button>
              )}

              {remainingDailyRequests !== null && (
                <span style={{ color: '#6B7280', fontSize: '0.76rem' }}>
                  {remainingDailyRequests} of 5 OTP requests remaining today
                </span>
              )}
            </div>
          </form>
        )}

        {/* =================================================================== */}
        {/* STEP 2B: STAFF PASSWORD LOGIN                                       */}
        {/* =================================================================== */}
        {currentStep === 'PASSWORD' && (
          <form onSubmit={handleStaffLogin} noValidate>
            {/* Phone Summary & Change button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1rem' }}>🇮🇳</span>
                <span style={{ color: '#ECC56C', fontWeight: 600, fontSize: '0.94rem' }}>
                  +91 {sanitizePhone(phone)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleBackToMobile}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9CA3AF',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Change Number
              </button>
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: '22px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <label
                  htmlFor="staff-password-input"
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 500,
                    color: '#EDEDED',
                  }}
                >
                  Staff Password <span style={{ color: '#EF4444' }}>*</span>
                </label>

                <Link
                  to={`/forgot-password?phone=${encodeURIComponent(sanitizePhone(phone))}`}
                  style={{
                    fontSize: '0.82rem',
                    color: '#ECC56C',
                    textDecoration: 'none',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#F3D079';
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#ECC56C';
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  Forgot Password?
                </Link>
              </div>

              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.55)',
                  border: '1.2px solid rgba(212, 175, 55, 0.65)',
                  borderRadius: '12px',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
                }}
              >
                <input
                  id="staff-password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  disabled={isLoading}
                  autoFocus
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: '13px 44px 13px 16px',
                    color: '#FFFFFF',
                    fontSize: '0.96rem',
                    letterSpacing: '0.04em',
                  }}
                />

                {/* Show/Hide password toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'transparent',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                border: 'none',
                background:
                  !password.trim() || isLoading
                    ? 'rgba(212, 175, 55, 0.35)'
                    : 'linear-gradient(135deg, #F3D079 0%, #E5B842 50%, #C89624 100%)',
                color: !password.trim() || isLoading ? 'rgba(0, 0, 0, 0.5)' : '#0A0805',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                cursor: !password.trim() || isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow:
                  !password.trim() || isLoading
                    ? 'none'
                    : '0 6px 20px rgba(229, 184, 66, 0.35)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>SIGNING IN...</span>
                </>
              ) : (
                <span>SIGN IN →</span>
              )}
            </button>
          </form>
        )}

        {/* Decorative Secure & Encrypted footer matching reference image */}
        <div
          style={{
            marginTop: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              flex: 1,
              height: '1px',
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#A89158',
              fontSize: '0.78rem',
              fontWeight: 500,
              userSelect: 'none',
            }}
          >
            <Lock size={12} color="#C9A84C" />
            <span>Secure &amp; Encrypted</span>
          </div>
          <div
            style={{
              flex: 1,
              height: '1px',
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
