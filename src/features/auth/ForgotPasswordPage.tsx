import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { ApiError } from '../../lib/api';

const OTP_EXPIRE_SECONDS = Number(import.meta.env.VITE_OTP_EXPIRE_SECONDS) || 300;

function formatOtpTimeLeft(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')} min`;
  }
  return `${secs}s`;
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

function isValidPhone(val: string): boolean {
  const digits = sanitizePhone(val);
  return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
}

function isValidEmail(val: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlPhone = searchParams.get('phone') || '';
  const urlEmail = searchParams.get('email') || '';
  const initialIdentifier = urlPhone ? sanitizePhone(urlPhone) : urlEmail || searchParams.get('identifier') || '';

  // Step: 'IDENTIFY' -> 'RESET' -> 'SUCCESS'
  const [step, setStep] = useState<'IDENTIFY' | 'RESET' | 'SUCCESS'>('IDENTIFY');

  // Input states
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Field level error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Lock States for Attempt/Resend limits
  const [isVerificationLocked, setIsVerificationLocked] = useState(false);
  const [isResendLocked, setIsResendLocked] = useState(false);

  // UI / Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  // OTP Expiration Timer
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRE_SECONDS);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (step === 'RESET' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timeLeft]);

  // Password Strength score
  const [strengthScore, setStrengthScore] = useState(0);
  const [strengthText, setStrengthText] = useState('');

  useEffect(() => {
    if (newPassword.length === 0) {
      setStrengthScore(0);
      setStrengthText('');
      return;
    }

    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    const displayScore = score === 0 ? 0 : score <= 2 ? 1 : score === 3 ? 2 : score === 4 ? 3 : 4;
    setStrengthScore(displayScore);

    if (displayScore === 1) setStrengthText('Weak');
    else if (displayScore === 2) setStrengthText('Fair');
    else if (displayScore === 3) setStrengthText('Good');
    else if (displayScore === 4) setStrengthText('Strong & Secure');
  }, [newPassword]);

  const getStrengthColor = () => {
    if (strengthScore === 1) return '#e74c3c';
    if (strengthScore === 2) return '#f39c12';
    if (strengthScore === 3) return '#f1c40f';
    if (strengthScore === 4) return '#2ecc71';
    return 'rgba(255,255,255,0.1)';
  };

  // Step 1 Validation: Identifier (Phone or Email)
  const validateIdentifierForm = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmed = identifier.trim();

    if (!trimmed) {
      errors.identifier = 'Registered mobile number or email address is required.';
    } else if (!isValidEmail(trimmed) && !isValidPhone(trimmed)) {
      errors.identifier = 'Please enter a valid 10-digit Indian mobile number or email address.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 2 Validation: OTP & Reset Password
  const validateResetForm = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedOtp = otp.trim();

    if (!trimmedOtp) {
      errors.otp = 'Verification code (OTP) is required.';
    } else if (!/^\d{6}$/.test(trimmedOtp)) {
      errors.otp = 'Please enter a valid 6-digit numeric OTP code.';
    }

    if (!newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters long.';
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPassword = 'New password must include at least one uppercase letter (A-Z).';
    } else if (!/[a-z]/.test(newPassword)) {
      errors.newPassword = 'New password must include at least one lowercase letter (a-z).';
    } else if (!/[0-9]/.test(newPassword)) {
      errors.newPassword = 'New password must include at least one number (0-9).';
    } else if (!/[^A-Za-z0-9]/.test(newPassword)) {
      errors.newPassword = 'New password must include at least one special character (!@#$%^&*).';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password.';
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 1: Send Forgot Password OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessInfo('');

    if (!validateIdentifierForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const trimmed = identifier.trim();
      const res = await authService.forgotPassword(trimmed);
      setSuccessInfo(res.message || 'If an account exists, a reset code has been sent.');
      setStep('RESET');
      setTimeLeft(res.expires_in || OTP_EXPIRE_SECONDS);
    } catch (err: unknown) {
      let msg = 'Failed to send password reset OTP.';
      if (err instanceof ApiError) {
        msg = err.detail;
        if (err.status === 429 || err.detail.includes('maximum OTP resend limit')) {
          setIsResendLocked(true);
        }
      } else if (err instanceof Error) {
        msg = err.message;
        if (msg.includes('maximum OTP resend limit')) {
          setIsResendLocked(true);
        }
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (timeLeft > 0 || isResending || isResendLocked) return;
    setError('');
    setIsResending(true);
    try {
      const trimmed = identifier.trim();
      const res = await authService.resendForgotOtp(trimmed);
      setSuccessInfo(res.message || 'OTP has been resent successfully.');
      setTimeLeft(res.expires_in || OTP_EXPIRE_SECONDS);
    } catch (err: unknown) {
      let msg = 'Failed to resend OTP.';
      if (err instanceof ApiError) {
        msg = err.detail;
        if (err.status === 429 || err.detail.includes('maximum OTP resend limit')) {
          setIsResendLocked(true);
        }
      } else if (err instanceof Error) {
        msg = err.message;
        if (msg.includes('maximum OTP resend limit')) {
          setIsResendLocked(true);
        }
      }
      setError(msg);
    } finally {
      setIsResending(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isVerificationLocked) {
      setError('You have reached the maximum number of OTP verification attempts. Please try again later.');
      return;
    }

    if (!validateResetForm()) {
      return;
    }

    if (timeLeft === 0) {
      setError('OTP has expired. Please click "Resend Code" to request a new OTP.');
      return;
    }

    setIsLoading(true);
    try {
      const trimmed = identifier.trim();
      await authService.resetPassword(trimmed, otp.trim(), newPassword, confirmPassword);
      setStep('SUCCESS');
    } catch (err: unknown) {
      let msg = 'Password reset failed. Please check your OTP.';
      if (err instanceof ApiError) {
        msg = err.detail;
        if (err.status === 429 || err.detail.includes('maximum number of OTP verification attempts')) {
          setIsVerificationLocked(true);
        }
      } else if (err instanceof Error) {
        msg = err.message;
        if (msg.includes('maximum number of OTP verification attempts')) {
          setIsVerificationLocked(true);
        }
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const isIdentifierPhone = isValidPhone(identifier);
  const displayTarget = isIdentifierPhone
    ? `+91 ${sanitizePhone(identifier)}`
    : identifier.trim();

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
      {/* Top Left "BACK TO LOGIN" Button */}
      <div
        style={{
          position: 'absolute',
          top: '28px',
          left: '28px',
          zIndex: 10,
        }}
      >
        <Link
          to="/login"
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
          <span>BACK TO LOGIN</span>
        </Link>
      </div>

      {/* Brand Header: Cocoa Pod Icon + CHOVIQUE + PREMIUM CHOCOLATES */}
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
            <path
              d="M32 6C20 6 12 18 12 32C12 46 22 58 32 58C42 58 52 46 52 32C52 18 44 6 32 6Z"
              stroke="#ECC56C"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M32 6V58M23 11C18 20 18 44 23 53M41 11C46 20 46 44 41 53"
              stroke="#ECC56C"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="2 3"
            />
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

      {/* Gold-Outlined Card */}
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
        {/* Card Header Nav: Back to Sign In */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '18px' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              color: '#ECC56C',
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: '9999px',
              background: 'rgba(236, 197, 108, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              transition: 'all 0.2s ease',
              letterSpacing: '0.04em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#F3D079';
              e.currentTarget.style.borderColor = '#ECC56C';
              e.currentTarget.style.background = 'rgba(236, 197, 108, 0.18)';
              e.currentTarget.style.transform = 'translateX(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#ECC56C';
              e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.4)';
              e.currentTarget.style.background = 'rgba(236, 197, 108, 0.08)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <ArrowLeft size={14} color="#ECC56C" />
            <span>Back to Sign In</span>
          </Link>
        </div>

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
            {step === 'IDENTIFY' && 'Reset Password'}
            {step === 'RESET' && 'Verify & Set Password'}
            {step === 'SUCCESS' && 'Password Updated!'}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: '0.92rem',
              color: '#A09B94',
              lineHeight: 1.5,
            }}
          >
            {step === 'IDENTIFY' && 'Enter your registered mobile number or email'}
            {step === 'RESET' && `Enter the 6-digit code sent to ${displayTarget}`}
            {step === 'SUCCESS' && 'Your password has been reset successfully'}
          </p>
        </div>

        {/* Global Error Alert */}
        {error && (
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
            <span>{error}</span>
          </div>
        )}

        {/* Global Success Alert */}
        {successInfo && (
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
            <span>{successInfo}</span>
          </div>
        )}

        {/* STEP 1: IDENTIFY USER (Phone or Email) */}
        {step === 'IDENTIFY' && (
          <form onSubmit={handleSendOtp} noValidate>
            <div style={{ marginBottom: '22px' }}>
              <label
                htmlFor="identifier-input"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  color: '#EDEDED',
                  marginBottom: '8px',
                }}
              >
                Mobile Number or Email <span style={{ color: '#EF4444' }}>*</span>
              </label>

              <input
                id="identifier-input"
                type="text"
                placeholder="e.g. 9876543210 or staff@chovique.com"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (fieldErrors.identifier) {
                    setFieldErrors((prev) => ({ ...prev, identifier: '' }));
                  }
                  if (error) setError('');
                }}
                disabled={isLoading}
                autoFocus
                style={{
                  width: '100%',
                  height: '48px',
                  background: 'rgba(0, 0, 0, 0.55)',
                  border: fieldErrors.identifier
                    ? '1.5px solid #EF4444'
                    : '1.2px solid rgba(212, 175, 55, 0.65)',
                  borderRadius: '12px',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
                  color: '#FFFFFF',
                  padding: '0 16px',
                  fontSize: '0.96rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {fieldErrors.identifier && (
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: '#EF4444',
                    marginTop: '6px',
                  }}
                >
                  {fieldErrors.identifier}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !identifier.trim()}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                border: 'none',
                background:
                  !identifier.trim() || isLoading
                    ? 'rgba(212, 175, 55, 0.35)'
                    : 'linear-gradient(135deg, #F3D079 0%, #E5B842 50%, #C89624 100%)',
                color: !identifier.trim() || isLoading ? 'rgba(0, 0, 0, 0.5)' : '#0A0805',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                cursor: !identifier.trim() || isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow:
                  !identifier.trim() || isLoading
                    ? 'none'
                    : '0 6px 20px rgba(229, 184, 66, 0.35)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>SENDING CODE...</span>
                </>
              ) : (
                <span>SEND RESET CODE →</span>
              )}
            </button>

            {/* Step 1 Return to Sign In */}
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#A09B94',
                  fontSize: '0.84rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ECC56C';
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#A09B94';
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                <ArrowLeft size={13} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: VERIFY OTP & SET NEW PASSWORD */}
        {step === 'RESET' && (
          <form onSubmit={handleResetPassword} noValidate>
            {/* Target Summary badge & change button */}
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
                <span style={{ color: '#ECC56C', fontWeight: 600, fontSize: '0.94rem' }}>
                  {displayTarget}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('IDENTIFY');
                  setOtp('');
                  setError('');
                }}
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
                Change
              </button>
            </div>

            {/* OTP Input */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="reset-otp-input"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  color: '#EDEDED',
                  marginBottom: '8px',
                }}
              >
                6-Digit Verification Code <span style={{ color: '#EF4444' }}>*</span>
              </label>

              <input
                id="reset-otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="• • • • • •"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(val);
                  if (fieldErrors.otp) {
                    setFieldErrors((prev) => ({ ...prev, otp: '' }));
                  }
                  if (error) setError('');
                }}
                disabled={isLoading || isVerificationLocked}
                autoFocus
                style={{
                  width: '100%',
                  height: '48px',
                  background: 'rgba(0, 0, 0, 0.55)',
                  border: fieldErrors.otp
                    ? '1.5px solid #EF4444'
                    : '1.2px solid rgba(212, 175, 55, 0.65)',
                  borderRadius: '12px',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
                  color: '#ECC56C',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  letterSpacing: '0.35em',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {fieldErrors.otp && (
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: '#EF4444',
                    marginTop: '6px',
                  }}
                >
                  {fieldErrors.otp}
                </span>
              )}
            </div>

            {/* OTP Expiration & Resend */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px',
                fontSize: '0.83rem',
              }}
            >
              <span
                style={{
                  color: timeLeft > 0 ? '#E5C158' : '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <KeyRound size={14} />
                {timeLeft > 0 ? `Code expires in ${formatOtpTimeLeft(timeLeft)}` : 'Code expired'}
              </span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={timeLeft > 0 || isResending || isResendLocked}
                style={{
                  background: 'none',
                  border: 'none',
                  color:
                    timeLeft > 0 || isResending || isResendLocked
                      ? 'rgba(255,255,255,0.3)'
                      : '#ECC56C',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor:
                    timeLeft > 0 || isResending || isResendLocked ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: timeLeft === 0 && !isResendLocked ? 'underline' : 'none',
                  opacity: isResendLocked ? 0.5 : 1,
                  padding: 0,
                }}
              >
                {isResending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Resend Code
              </button>
            </div>

            {/* New Password */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="new-password-input"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  color: '#EDEDED',
                  marginBottom: '8px',
                }}
              >
                New Password <span style={{ color: '#EF4444' }}>*</span>
              </label>

              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.55)',
                  border: fieldErrors.newPassword
                    ? '1.5px solid #EF4444'
                    : '1.2px solid rgba(212, 175, 55, 0.65)',
                  borderRadius: '12px',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
                }}
              >
                <input
                  id="new-password-input"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (fieldErrors.newPassword) {
                      setFieldErrors((prev) => ({ ...prev, newPassword: '' }));
                    }
                    if (error) setError('');
                  }}
                  disabled={isLoading || isVerificationLocked}
                  autoComplete="new-password"
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
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
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
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Strength Score */}
              {newPassword.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div
                    style={{
                      height: '4px',
                      width: '100%',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${(strengthScore / 4) * 100}%`,
                        background: getStrengthColor(),
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '0.73rem',
                      color: getStrengthColor(),
                      marginTop: '4px',
                      display: 'block',
                    }}
                  >
                    Strength: {strengthText}
                  </span>
                </div>
              )}
              {fieldErrors.newPassword && (
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: '#EF4444',
                    marginTop: '6px',
                  }}
                >
                  {fieldErrors.newPassword}
                </span>
              )}
            </div>

            {/* Confirm New Password */}
            <div style={{ marginBottom: '22px' }}>
              <label
                htmlFor="confirm-password-input"
                style={{
                  display: 'block',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  color: '#EDEDED',
                  marginBottom: '8px',
                }}
              >
                Confirm New Password <span style={{ color: '#EF4444' }}>*</span>
              </label>

              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.55)',
                  border: fieldErrors.confirmPassword
                    ? '1.5px solid #EF4444'
                    : '1.2px solid rgba(212, 175, 55, 0.65)',
                  borderRadius: '12px',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
                }}
              >
                <input
                  id="confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                    }
                    if (error) setError('');
                  }}
                  disabled={isLoading || isVerificationLocked}
                  autoComplete="new-password"
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
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    color: '#EF4444',
                    marginTop: '6px',
                  }}
                >
                  {fieldErrors.confirmPassword}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || isVerificationLocked}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                border: 'none',
                background:
                  isLoading || isVerificationLocked
                    ? 'rgba(212, 175, 55, 0.35)'
                    : 'linear-gradient(135deg, #F3D079 0%, #E5B842 50%, #C89624 100%)',
                color: isLoading || isVerificationLocked ? 'rgba(0, 0, 0, 0.5)' : '#0A0805',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                cursor: isLoading || isVerificationLocked ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow:
                  isLoading || isVerificationLocked
                    ? 'none'
                    : '0 6px 20px rgba(229, 184, 66, 0.35)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>RESETTING PASSWORD...</span>
                </>
              ) : (
                <span>UPDATE PASSWORD &amp; SIGN IN →</span>
              )}
            </button>

            {/* Step 2 Back to Sign In */}
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  color: '#A09B94',
                  fontSize: '0.86rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ECC56C';
                  e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                  e.currentTarget.style.background = 'rgba(236, 197, 108, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#A09B94';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'SUCCESS' && (
          <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(46, 204, 113, 0.15)',
                border: '1.5px solid #2ecc71',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2ecc71',
                marginBottom: '16px',
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <p
              style={{
                color: '#A09B94',
                fontSize: '0.92rem',
                marginBottom: '26px',
                lineHeight: 1.6,
              }}
            >
              Your password has been successfully updated. You can now sign in using your new password.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              style={{
                width: '100%',
                height: '48px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #F3D079 0%, #E5B842 50%, #C89624 100%)',
                color: '#0A0805',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 20px rgba(229, 184, 66, 0.35)',
              }}
            >
              PROCEED TO SIGN IN →
            </button>
          </div>
        )}

        {/* Helper footer link */}
        <div style={{ marginTop: '22px', textAlign: 'center' }}>
          <span style={{ color: '#A09B94', fontSize: '0.84rem' }}>
            Remembered your credentials?{' '}
            <Link
              to="/login"
              style={{
                color: '#ECC56C',
                fontWeight: 600,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Sign In
            </Link>
          </span>
        </div>

        {/* Footer: Secure & Encrypted */}
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

export default ForgotPasswordPage;
