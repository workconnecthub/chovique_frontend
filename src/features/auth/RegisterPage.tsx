import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, RefreshCw, KeyRound, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../app/providers';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LegalModal } from '../../components/LegalModal';
import { authService } from '../../services/authService';
import { ApiError } from '../../lib/api';

const OTP_EXPIRE_SECONDS = Number(import.meta.env.VITE_OTP_EXPIRE_SECONDS) || 300;

const formatOtpTimeLeft = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')} min`;
  }
  return `${secs}s`;
};

export const RegisterPage: React.FC = () => {
  const { verifyOtp } = useApp();
  const navigate = useNavigate();

  // Step state: 'DETAILS' -> 'OTP'
  const [step, setStep] = useState<'DETAILS' | 'OTP'>('DETAILS');

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Legal Modal State: 'terms' | 'privacy' | null
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | null>(null);

  // Field Level Error State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // OTP Verification State
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRE_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const [successInfo, setSuccessInfo] = useState('');

  // Lock States for Attempt/Resend limits
  const [isVerificationLocked, setIsVerificationLocked] = useState(false);
  const [isResendLocked, setIsResendLocked] = useState(false);

  // UI State
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 30-Second Countdown Timer for OTP
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (step === 'OTP' && timeLeft > 0) {
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

  // Password Strength calculation
  const [strengthScore, setStrengthScore] = useState(0);
  const [strengthText, setStrengthText] = useState('');

  useEffect(() => {
    if (password.length === 0) {
      setStrengthScore(0);
      setStrengthText('');
      return;
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const displayScore = score === 0 ? 0 : score <= 2 ? 1 : score === 3 ? 2 : score === 4 ? 3 : 4;
    setStrengthScore(displayScore);

    if (displayScore === 1) setStrengthText('Weak');
    else if (displayScore === 2) setStrengthText('Fair');
    else if (displayScore === 3) setStrengthText('Good');
    else if (displayScore === 4) setStrengthText('Strong & Secure');
  }, [password]);

  const getStrengthColor = () => {
    if (strengthScore === 1) return '#e74c3c';
    if (strengthScore === 2) return '#f39c12';
    if (strengthScore === 3) return '#f1c40f';
    if (strengthScore === 4) return '#2ecc71';
    return 'rgba(255,255,255,0.1)';
  };

  // Field validation logic
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    // Name Validation
    if (!trimmedName) {
      errors.name = 'Full Name is required.';
    } else if (trimmedName.length < 2) {
      errors.name = 'Full Name must be at least 2 characters long.';
    } else if (!/[a-zA-Z]/.test(trimmedName)) {
      errors.name = 'Full Name must contain valid letters.';
    }

    // Email Validation
    if (!trimmedEmail) {
      errors.email = 'Email Address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    // Password Validation
    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    } else if (!/[A-Z]/.test(password)) {
      errors.password = 'Password must include at least one uppercase letter (A-Z).';
    } else if (!/[a-z]/.test(password)) {
      errors.password = 'Password must include at least one lowercase letter (a-z).';
    } else if (!/[0-9]/.test(password)) {
      errors.password = 'Password must include at least one number (0-9).';
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      errors.password = 'Password must include at least one special character (!@#$%^&*).';
    }

    // Confirm Password Validation
    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm Password is required.';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    // Terms Acceptance Validation
    if (!termsAccepted) {
      errors.terms = 'You must accept the Terms of Service & Privacy Policy to register.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Phase 1 Submit: Validate & Send OTP via SMTP
  const handleSendOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessInfo('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.sendOtp({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });
      setStep('OTP');
      setTimeLeft(response.expires_in || OTP_EXPIRE_SECONDS);
      setSuccessInfo(`6-digit OTP sent successfully to ${email.trim()}`);
    } catch (err: unknown) {
      let msg = 'Failed to send OTP. Please try again.';
      if (err instanceof ApiError) {
        msg = err.detail;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 2 Submit: Verify 6-digit OTP
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessInfo('');

    if (isVerificationLocked) {
      setError('You have reached the maximum number of OTP verification attempts. Please try again later.');
      return;
    }

    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setError('OTP is required.');
      return;
    }
    if (!/^\d{6}$/.test(trimmedOtp)) {
      setError('Please enter a valid 6-digit numeric OTP code.');
      return;
    }
    if (timeLeft === 0) {
      setError('OTP has expired. Please click "Resend OTP" below.');
      return;
    }

    setIsLoading(true);
    const result = await verifyOtp(email.trim(), trimmedOtp, name.trim(), password);
    setIsLoading(false);

    if (!result.success) {
      const errorMsg = result.error || 'Incorrect OTP. Please try again.';
      if (result.status === 429 || errorMsg.includes('maximum number of OTP verification attempts')) {
        setIsVerificationLocked(true);
      }
      setError(errorMsg);
      return;
    }

    navigate('/');
  };

  // Resend OTP Action
  const handleResendOtp = async () => {
    if (timeLeft > 0 || isResending || isResendLocked) return;
    setError('');
    setSuccessInfo('');
    setIsResending(true);
    try {
      const response = await authService.resendOtp(email.trim());
      setTimeLeft(response.expires_in || OTP_EXPIRE_SECONDS);
      setOtp('');
      setSuccessInfo('OTP has been resent successfully.');
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

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Back Link */}
        {step === 'OTP' ? (
          <button
            type="button"
            onClick={() => {
              setStep('DETAILS');
              setError('');
              setSuccessInfo('');
              setFieldErrors({});
            }}
            className="back-to-store-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            Edit Registration Details
          </button>
        ) : (
          <Link to="/" className="back-to-store-link">
            <ArrowLeft size={16} />
            Back to Store
          </Link>
        )}

        {/* Header */}
        <div className="auth-header">
          <h2 className="auth-title">
            {step === 'DETAILS' ? 'Create Account' : 'Email Verification'}
          </h2>
          <p className="auth-subtitle">
            {step === 'DETAILS'
              ? 'Join the Chovique Circle'
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            role="alert"
            style={{
              background: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid #e74c3c',
              color: '#e74c3c',
              borderRadius: '4px',
              padding: '10px 14px',
              fontSize: '0.85rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>{error}</span>
          </div>
        )}

        {/* Global Info/Success Banner */}
        {successInfo && (
          <div
            style={{
              background: 'rgba(46, 204, 113, 0.1)',
              border: '1px solid #2ecc71',
              color: '#2ecc71',
              borderRadius: '4px',
              padding: '10px 14px',
              fontSize: '0.85rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successInfo}</span>
          </div>
        )}

        {/* STEP 1: Registration Details Form */}
        {step === 'DETAILS' && (
          <form onSubmit={handleSendOtpSubmit} noValidate>
            <Input
              label="Full Name"
              placeholder="Your Full Name"
              value={name}
              error={fieldErrors.name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((prev) => ({ ...prev, name: '' }));
                }
                if (error) setError('');
              }}
              required
              autoComplete="name"
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              error={fieldErrors.email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: '' }));
                }
                if (error) setError('');
              }}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              error={fieldErrors.password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: '' }));
                }
                if (error) setError('');
              }}
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              error={fieldErrors.confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                }
                if (error) setError('');
              }}
              required
              autoComplete="new-password"
            />

            {/* Password Strength Indicator & Rules */}
            <div style={{ marginBottom: '16px', marginTop: '-6px' }}>
              {password.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'var(--beige)',
                      marginBottom: '6px',
                    }}
                  >
                    <span>Password Strength</span>
                    <span style={{ color: getStrengthColor(), fontWeight: 600 }}>{strengthText}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="strength-bar-segment"
                        style={{
                          background: idx < strengthScore ? getStrengthColor() : undefined,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <p style={{ fontSize: '0.75rem', color: 'var(--grey-light)', margin: 0 }}>
                Must be at least 8 characters with uppercase (A-Z), lowercase (a-z), number (0-9), and special character.
              </p>
            </div>

            <div className="form-checkbox-row" style={{ justifyContent: 'flex-start', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    if (fieldErrors.terms) {
                      setFieldErrors((prev) => ({ ...prev, terms: '' }));
                    }
                    if (error) setError('');
                  }}
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--cream)' }}>
                  I accept the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setLegalModalType('terms');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--gold)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      font: 'inherit',
                      fontSize: 'inherit',
                      fontWeight: 600,
                    }}
                  >
                    Terms of Service
                  </button>{' '}
                  &{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setLegalModalType('privacy');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--gold)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      font: 'inherit',
                      fontSize: 'inherit',
                      fontWeight: 600,
                    }}
                  >
                    Privacy Policy
                  </button>
                  <span style={{ color: '#e74c3c', marginLeft: '4px', fontWeight: 600 }}>*</span>
                </span>
              </label>
              {fieldErrors.terms && (
                <span style={{ fontSize: '0.75rem', color: 'var(--rose-gold)', marginTop: '2px' }}>
                  {fieldErrors.terms}
                </span>
              )}
            </div>

            <Button
              variant="gold"
              fullWidth
              size="lg"
              type="submit"
              glow
              disabled={isLoading}
              style={{ gap: '10px', marginTop: '16px' }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Sending Verification OTP...
                </>
              ) : (
                <>
                  <Mail size={18} />
                  Submit & Send OTP
                </>
              )}
            </Button>
          </form>
        )}

        {/* STEP 2: Inline 6-Digit OTP Verification Form */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtpSubmit} noValidate>
            <div
              style={{
                background: 'rgba(201, 168, 76, 0.08)',
                border: '1px solid var(--gold)',
                borderRadius: '6px',
                padding: '12px 16px',
                marginBottom: '20px',
                fontSize: '0.85rem',
                color: 'var(--beige)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={18} style={{ color: 'var(--gold)' }} />
                <span>Verification code sent to <strong>{email}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('DETAILS');
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--gold)',
                  fontSize: '0.8rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Change
              </button>
            </div>

            {/* 6-Digit OTP Input */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  color: 'var(--beige)',
                  marginBottom: '8px',
                  fontWeight: 500,
                }}
              >
                Enter 6-Digit OTP Code
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  disabled={isVerificationLocked}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(cleaned);
                    if (error) setError('');
                  }}
                  placeholder="• • • • • •"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1.5rem',
                    letterSpacing: '12px',
                    textAlign: 'center',
                    fontWeight: 700,
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: timeLeft > 0 ? '1px solid var(--gold)' : '1px solid #e74c3c',
                    borderRadius: '6px',
                    color: 'var(--gold)',
                    outline: 'none',
                    boxShadow: '0 0 10px rgba(201, 168, 76, 0.15)',
                    opacity: isVerificationLocked ? 0.5 : 1,
                  }}
                />
              </div>
            </div>

            {/* 30-Second Countdown & Resend Option */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                fontSize: '0.85rem',
              }}
            >
              {timeLeft > 0 ? (
                <div style={{ color: '#E5C158', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <KeyRound size={16} />
                  <span>OTP expires in <strong>{formatOtpTimeLeft(timeLeft)}</strong></span>
                </div>
              ) : (
                <div style={{ color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠️ OTP Expired (0s)</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={timeLeft > 0 || isResending || isResendLocked}
                style={{
                  background: 'none',
                  border: 'none',
                  color: timeLeft === 0 && !isResendLocked ? 'var(--gold)' : 'var(--grey-light)',
                  cursor: timeLeft === 0 && !isResending && !isResendLocked ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: timeLeft > 0 || isResendLocked ? 0.5 : 1,
                  textDecoration: timeLeft === 0 && !isResendLocked ? 'underline' : 'none',
                }}
              >
                {isResending ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Resending...
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    Resend OTP
                  </>
                )}
              </button>
            </div>

            <Button
              variant="gold"
              fullWidth
              size="lg"
              type="submit"
              glow
              disabled={isLoading || otp.length < 6 || timeLeft === 0 || isVerificationLocked}
              style={{ gap: '10px' }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Verifying OTP...
                </>
              ) : (
                'Verify & Complete Registration'
              )}
            </Button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--grey-light)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>
            Sign In
          </Link>
        </p>
      </div>

      {/* Terms and Privacy Policy Separate Card Dialog */}
      <LegalModal
        isOpen={legalModalType !== null}
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
        onAccept={() => {
          setTermsAccepted(true);
          if (fieldErrors.terms) {
            setFieldErrors((prev) => ({ ...prev, terms: '' }));
          }
        }}
      />
    </div>
  );
};

export default RegisterPage;
