import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Mail, RefreshCw, KeyRound, CheckCircle2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useApp } from '../../app/providers';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { ApiError } from '../../lib/api';

const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const isGoogleAuthEnabled = Boolean(googleClientId && !googleClientId.includes('your_google_client_id'));

const OTP_EXPIRE_SECONDS = Number(import.meta.env.VITE_OTP_EXPIRE_SECONDS) || 300;

const formatOtpTimeLeft = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')} min`;
  }
  return `${secs}s`;
};

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { googleLogin } = useApp();

  // Step: 'EMAIL' -> 'RESET' -> 'SUCCESS'
  const [step, setStep] = useState<'EMAIL' | 'RESET' | 'SUCCESS'>('EMAIL');

  // Input states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Field level error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Lock States for Attempt/Resend limits
  const [isVerificationLocked, setIsVerificationLocked] = useState(false);
  const [isResendLocked, setIsResendLocked] = useState(false);

  // UI / Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  // OTP Expiration Timer (configured via env: 5 minutes / 300 seconds)
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

  // Step 1 Validation: Email
  const validateEmailForm = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Registered Email Address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
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
      errors.newPassword = 'New Password is required.';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'New Password must be at least 8 characters long.';
    } else if (!/[A-Z]/.test(newPassword)) {
      errors.newPassword = 'New Password must include at least one uppercase letter (A-Z).';
    } else if (!/[a-z]/.test(newPassword)) {
      errors.newPassword = 'New Password must include at least one lowercase letter (a-z).';
    } else if (!/[0-9]/.test(newPassword)) {
      errors.newPassword = 'New Password must include at least one number (0-9).';
    } else if (!/[^A-Za-z0-9]/.test(newPassword)) {
      errors.newPassword = 'New Password must include at least one special character (!@#$%^&*).';
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

    if (!validateEmailForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      setSuccessInfo(res.message || 'If an account exists for this email, an OTP has been sent.');
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
      const res = await authService.resendForgotOtp(email.trim());
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
      await authService.resetPassword(email.trim(), otp.trim(), newPassword, confirmPassword);
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

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Back Link */}
        <Link to="/login" className="back-to-store-link">
          <ArrowLeft size={16} /> Back to Login
        </Link>

        {/* Header */}
        <div className="auth-header">
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'rgba(201, 168, 76, 0.15)',
              border: '1px solid var(--gold)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--gold)',
              marginBottom: '14px',
            }}
          >
            {step === 'SUCCESS' ? (
              <CheckCircle2 size={26} style={{ color: '#2ecc71' }} />
            ) : step === 'RESET' ? (
              <Mail size={26} />
            ) : (
              <KeyRound size={26} />
            )}
          </div>
          <h2 className="auth-title">
            {step === 'EMAIL'
              ? 'Reset Password'
              : step === 'RESET'
              ? 'Verify & New Password'
              : 'Reset Complete!'}
          </h2>
          <p className="auth-subtitle">
            {step === 'EMAIL'
              ? 'Enter your email to receive a reset code'
              : step === 'RESET'
              ? `OTP sent to ${email}`
              : 'Your password has been updated'}
          </p>
        </div>

        {/* Error Banner */}
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
            }}
          >
            {error}
          </div>
        )}

        {/* Success Info Banner */}
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

        {/* STEP 1: Email Form */}
        {step === 'EMAIL' && (
          <form onSubmit={handleSendOtp} noValidate>
            <Input
              label="Registered Email Address"
              type="email"
              placeholder="connoisseur@chovique.com"
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

            <Button
              variant="gold"
              fullWidth
              size="lg"
              type="submit"
              glow
              disabled={isLoading}
              style={{ gap: '10px' }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Sending Reset Code...
                </>
              ) : (
                'Send Reset Code'
              )}
            </Button>

            {isGoogleAuthEnabled && (
              <>
                <div className="auth-divider" style={{ margin: '24px 0' }}>Or continue with</div>

                <div className="social-login-group">
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <GoogleLogin
                      onSuccess={async (credentialResponse) => {
                        if (credentialResponse.credential) {
                          setIsGoogleLoading(true);
                          setError('');
                          try {
                            const result = await googleLogin(credentialResponse.credential);
                            if (result.success) {
                              if (result.user && result.user.has_password === false) {
                                navigate('/set-password');
                              } else if (result.role === 'admin') {
                                navigate('/admin');
                              } else if (result.role === 'superadmin') {
                                navigate('/superadmin');
                              } else {
                                navigate('/');
                              }
                            } else {
                              setError(result.error || 'Google Sign-In failed.');
                            }
                          } catch (err: unknown) {
                            const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
                            setError(msg);
                          } finally {
                            setIsGoogleLoading(false);
                          }
                        }
                      }}
                      onError={() => {
                        console.warn(`[Chovique] Google Sign-In origin (${window.location.origin}) is not authorized.`);
                      }}
                      theme="filled_black"
                      shape="rectangular"
                      size="large"
                      text="continue_with"
                    />
                  </div>
                </div>
                {isGoogleLoading && (
                  <p style={{ textAlign: 'center', color: 'var(--gold)', fontSize: '0.85rem', marginTop: '8px' }}>
                    Signing in with Google...
                  </p>
                )}
              </>
            )}
          </form>
        )}

        {/* STEP 2: OTP + New Password Form */}
        {step === 'RESET' && (
          <form onSubmit={handleResetPassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Input
              label="6-Digit Verification Code (OTP)"
              type="text"
              placeholder="123456"
              maxLength={6}
              value={otp}
              error={fieldErrors.otp}
              disabled={isVerificationLocked}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(cleaned);
                if (fieldErrors.otp) {
                  setFieldErrors((prev) => ({ ...prev, otp: '' }));
                }
                if (error) setError('');
              }}
              required
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                fontSize: '0.83rem',
              }}
            >
              <span style={{ color: timeLeft > 0 ? '#E5C158' : '#e74c3c', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <KeyRound size={14} />
                {timeLeft > 0 ? `OTP expires in ${formatOtpTimeLeft(timeLeft)}` : '⚠️ OTP Expired'}
              </span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={timeLeft > 0 || isResending || isResendLocked}
                style={{
                  background: 'none',
                  border: 'none',
                  color: timeLeft > 0 || isResending || isResendLocked ? 'rgba(255,255,255,0.3)' : 'var(--gold)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: timeLeft > 0 || isResending || isResendLocked ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: timeLeft === 0 && !isResendLocked ? 'underline' : 'none',
                  opacity: isResendLocked ? 0.5 : 1,
                }}
              >
                {isResending ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <RefreshCw size={14} />
                )}
                Resend Code
              </button>
            </div>

            <Input
              label="New Password"
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              error={fieldErrors.newPassword}
              disabled={isVerificationLocked}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (fieldErrors.newPassword) {
                  setFieldErrors((prev) => ({ ...prev, newPassword: '' }));
                }
                if (error) setError('');
              }}
              required
              autoComplete="new-password"
            />

            {/* Password Strength Meter */}
            <div style={{ marginBottom: '16px', marginTop: '-6px' }}>
              {newPassword.length > 0 && (
                <div style={{ marginBottom: '6px' }}>
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
                  <span style={{ fontSize: '0.73rem', color: getStrengthColor(), marginTop: '4px', display: 'block' }}>
                    Password Strength: {strengthText}
                  </span>
                </div>
              )}
              <p style={{ fontSize: '0.75rem', color: 'var(--grey-light)', margin: 0 }}>
                Must be at least 8 characters with uppercase (A-Z), lowercase (a-z), number (0-9), and special character.
              </p>
            </div>

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              error={fieldErrors.confirmPassword}
              disabled={isVerificationLocked}
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

            <Button
              variant="gold"
              fullWidth
              size="lg"
              type="submit"
              glow
              disabled={isLoading || isVerificationLocked}
              style={{ gap: '10px', marginTop: '4px' }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  Resetting Password...
                </>
              ) : (
                'Reset Password & Sign In'
              )}
            </Button>
          </form>
        )}

        {/* STEP 3: Success */}
        {step === 'SUCCESS' && (
          <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
            <CheckCircle2 size={56} style={{ color: '#2ecc71', margin: '0 auto 20px' }} />
            <p style={{ color: 'var(--grey-light)', fontSize: '0.9rem', marginBottom: '28px', lineHeight: 1.6 }}>
              Your password has been successfully updated. You can now log in with your new credentials.
            </p>
            <Button
              variant="gold"
              fullWidth
              size="lg"
              glow
              onClick={() => navigate('/login', { replace: true })}
            >
              Proceed to Sign In
            </Button>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--grey-light)' }}>
          Remember your password?{' '}
          <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
