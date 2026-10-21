import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useApp } from '../../app/providers';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const isGoogleAuthEnabled = Boolean(googleClientId && !googleClientId.includes('your_google_client_id'));

/**
 * Validate and sanitize return URLs to strictly prevent open redirects.
 * Allows only relative internal paths (must start with a single '/').
 */
export function getSafeReturnUrl(target: unknown): string {
  if (typeof target !== 'string' || !target.trim()) return '/';
  const trimmed = target.trim();
  // Must start with '/' and NOT '//' or '/\'
  if (/^\/[^/\\]/.test(trimmed) || trimmed === '/') {
    // Prevent scheme protocols like javascript:, http:, etc.
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
      return trimmed;
    }
  }
  return '/';
}

export const LoginPage: React.FC = () => {
  const { login, googleLogin } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect target after login (e.g. /checkout or /)
  const locationState = location.state as { from?: string } | undefined;
  const searchParams = new URLSearchParams(location.search);
  const rawTarget = searchParams.get('returnUrl') || searchParams.get('redirect') || locationState?.from;
  const from = getSafeReturnUrl(rawTarget);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Field Level Errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Email Address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    const result = await login(email.trim(), password);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error || 'Invalid email or password.');
      return;
    }

    if (result.role === 'admin') {
      navigate('/admin');
    } else if (result.role === 'superadmin') {
      navigate('/superadmin');
    } else if (result.role === 'delivery_boy') {
      navigate('/delivery');
    } else {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Back Link */}
        <Link to="/" className="back-to-store-link">
          <ArrowLeft size={16} />
          Back
        </Link>

        {/* Header */}
        <div className="auth-header">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Sign in to Chovique</p>
        </div>

        {isGoogleLoading && (
          <div
            style={{
              padding: '14px 18px',
              background: 'rgba(201, 168, 76, 0.15)',
              border: '1px solid var(--gold)',
              borderRadius: '8px',
              color: 'var(--gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '20px',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Authenticating with Google... Redirecting, please wait.</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} noValidate>
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
            autoComplete="current-password"
          />

          <div className="form-checkbox-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember Me</span>
            </label>
            <Link to="/forgot-password" style={{ color: 'var(--gold)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              Forgot Password?
            </Link>
          </div>

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
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Visual Divider Labelled 'OR' */}
        <div className="auth-divider" style={{ margin: '24px 0', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, fontSize: '0.8rem', color: 'var(--gold)' }}>
          OR
        </div>

        {/* One Google Option for New & Returning Customers */}
        <div className="social-login-group">
          {isGoogleAuthEnabled ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  if (credentialResponse.credential) {
                    setIsGoogleLoading(true);
                    setError('');
                    try {
                      const result = await googleLogin(credentialResponse.credential);
                      if (result.success) {
                        if (result.user && result.user.has_password === false) {
                          navigate('/set-password', { state: { from } });
                        } else if (result.role === 'admin') {
                          navigate('/admin');
                        } else if (result.role === 'superadmin') {
                          navigate('/superadmin');
                        } else if (result.role === 'delivery_boy') {
                          navigate('/delivery');
                        } else {
                          navigate(from, { replace: true });
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
                  const origin = window.location.origin;
                  console.warn(`[Chovique] Google Sign-In failed: origin (${origin}) is not authorized in Google Cloud Console.`);
                  setError(`Google Sign-In error (origin_mismatch): Please ensure "${origin}" is added to "Authorized JavaScript origins" in Google Cloud Console.`);
                }}
                theme="filled_black"
                shape="rectangular"
                size="large"
                text="continue_with"
              />
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid rgba(201, 168, 76, 0.35)',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                color: 'var(--cream)',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
              onClick={() => {
                setError('Google Authentication is ready. In production, configure VITE_GOOGLE_CLIENT_ID in your environment.');
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Continue with Google</span>
            </div>
          )}

          {/* Supporting text */}
          <p
            style={{
              textAlign: 'center',
              marginTop: '12px',
              fontSize: '0.8rem',
              color: 'var(--beige)',
              lineHeight: 1.4,
              opacity: 0.9,
            }}
          >
            New customers can create an account with Google. Returning customers can sign in with Google.
          </p>
        </div>

        {/* Registration Link */}
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--grey-light)' }}>
          New to Chovique?{' '}
          <Link to="/register" style={{ color: 'var(--gold)', fontWeight: 600 }}>
            Create an account.
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
